"""HTTP API for the web studio.  Run:  uvicorn nemi.api:app --port 8000"""

import asyncio
import time
from pathlib import Path
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, pipeline, render, store, voice
from .schema import THEMES, DiagramPartSpec, Lesson, QuizSpec, Scene
from .store import Editor, folder, log, rel
from .tts import VOICES

app = FastAPI(title="Nemi engine")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS + ["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/files", StaticFiles(directory=config.LESSONS), name="files")

_tasks: set[asyncio.Task] = set()


def _spawn(coro) -> None:
    task = asyncio.create_task(coro)
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def _get(lesson_id: str) -> Lesson:
    if not store.exists(lesson_id):
        raise HTTPException(404, "lesson not found")
    return store.load(lesson_id)


@app.get("/api/health")
def health():
    return {"ok": True, "models": {"planner": config.PLANNER_MODEL, "coder": config.CODER_MODEL}}


@app.get("/api/options")
def options():
    return {"voices": VOICES, "themes": THEMES}


@app.post("/api/lessons")
async def create_lesson(
    topic: str = Form(""),
    audience: str = Form("Students"),
    language: str = Form("Spanish"),
    voice: str = Form("es-BO-SofiaNeural"),
    format: Literal["landscape", "portrait"] = Form("landscape"),
    length: Literal["short", "standard", "long"] = Form("short"),
    theme: str = Form("night"),
    deep: bool = Form(False),
    file: UploadFile | None = File(None),
):
    pdf = None
    if file is not None and file.filename:
        raw = await file.read()
        if len(raw) > 45_000_000:
            raise HTTPException(413, "PDF too large (max 45 MB)")
        pdf = (raw, file.filename)
    if not topic.strip() and not pdf:
        raise HTTPException(400, "Give a topic or attach a PDF")
    lesson = Lesson(topic=topic.strip(), audience=audience, language=language, voice=voice, format=format,
                    theme=THEMES.get(theme, THEMES["night"]), source_name=pdf[1] if pdf else None,
                    planner="muse-wonder-1.0" if deep else config.PLANNER_MODEL)
    store.save(lesson)
    if pdf:
        (folder(lesson.id) / "source.pdf").write_bytes(pdf[0])
    _spawn(pipeline.create(lesson.id, length=length, pdf=pdf))
    return lesson


@app.get("/api/lessons")
def list_lessons():
    return [
        {"id": l.id, "title": l.title or l.topic or l.source_name, "status": l.status, "created_at": l.created_at,
         "format": l.format, "theme": l.theme.name, "scenes": len(l.scenes),
         "cover": next((s.assets.image for s in l.scenes if s.assets.image), None)}
        for l in store.all_lessons()
    ]


@app.get("/api/lessons/{lesson_id}")
def get_lesson(lesson_id: str):
    return _get(lesson_id)


class LessonPatch(BaseModel):
    title: str | None = None
    theme: str | None = None
    format: Literal["landscape", "portrait"] | None = None
    voice: str | None = None
    scene_order: list[str] | None = None


@app.patch("/api/lessons/{lesson_id}")
async def patch_lesson(lesson_id: str, patch: LessonPatch):
    _get(lesson_id)
    revoice = False
    async with Editor(lesson_id) as lesson:
        if patch.title is not None:
            lesson.title = patch.title
        if patch.theme in THEMES:
            lesson.theme = THEMES[patch.theme]
        if patch.format:
            lesson.format = patch.format
        if patch.voice and patch.voice != lesson.voice:
            lesson.voice, revoice = patch.voice, True
        if patch.scene_order:
            by_id = {s.id: s for s in lesson.scenes}
            lesson.scenes = [by_id[i] for i in patch.scene_order if i in by_id] + \
                [s for s in lesson.scenes if s.id not in patch.scene_order]
        ids = [s.id for s in lesson.scenes if s.assets.narration is None or s.assets.narration.source == "tts"]
    if revoice:
        _spawn(asyncio.gather(*(pipeline.narrate(lesson_id, i) for i in ids)))
    return store.load(lesson_id)


class ScenePatch(BaseModel):
    title: str | None = None
    narration: str | None = None
    points: list[str] | None = None
    image_prompt: str | None = None
    latex: list[str] | None = None
    quiz: QuizSpec | None = None
    diagram_parts: list[DiagramPartSpec] | None = None
    manim_brief: str | None = None


@app.patch("/api/lessons/{lesson_id}/scenes/{scene_id}")
async def patch_scene(lesson_id: str, scene_id: str, patch: ScenePatch):
    """Edit a scene. Changed narration is re-voiced and changed parts are re-located right away."""
    _get(lesson_id)
    changes = patch.model_dump(exclude_none=True)
    old: Scene | None = None

    def apply(s: Scene):
        nonlocal old
        old = s.model_copy(deep=True)
        for k, v in changes.items():
            setattr(s, k, getattr(patch, k))
    await pipeline.update_scene(lesson_id, scene_id, apply)
    if old is None:
        raise HTTPException(404, "scene not found")
    if ("narration" in changes and patch.narration != old.narration) or \
            ("quiz" in changes and old.kind == "quiz"):
        _spawn(pipeline.narrate(lesson_id, scene_id))
    if "diagram_parts" in changes and old.kind == "diagram":
        _spawn(pipeline.locate_parts(lesson_id, scene_id))
    return store.load(lesson_id)


@app.post("/api/lessons/{lesson_id}/scenes/{scene_id}/redraw")
async def redraw(lesson_id: str, scene_id: str):
    _get(lesson_id)

    async def job():
        await pipeline.draw(lesson_id, scene_id)
        _, scene = pipeline._scene(lesson_id, scene_id)
        if scene.kind == "diagram":
            await pipeline.locate_parts(lesson_id, scene_id)
    _spawn(job())
    return {"ok": True}


@app.post("/api/lessons/{lesson_id}/scenes/{scene_id}/animate")
async def reanimate(lesson_id: str, scene_id: str):
    _get(lesson_id)
    _spawn(pipeline.animate(lesson_id, scene_id))
    return {"ok": True}


@app.post("/api/lessons/{lesson_id}/scenes/{scene_id}/narrate")
async def renarrate(lesson_id: str, scene_id: str):
    _get(lesson_id)
    await pipeline.narrate(lesson_id, scene_id)
    return store.load(lesson_id)


@app.post("/api/lessons/{lesson_id}/scenes/{scene_id}/voice")
async def teacher_voice(lesson_id: str, scene_id: str, audio: UploadFile = File(...)):
    """The teacher records this scene in their own voice; Muse Voice Transcribe writes the captions."""
    lesson = _get(lesson_id)
    raw = await audio.read()
    rec_dir = folder(lesson_id) / "voice"
    rec_dir.mkdir(parents=True, exist_ok=True)
    src = rec_dir / f"{scene_id}-{int(time.time())}{Path(audio.filename or 'rec.webm').suffix or '.webm'}"
    src.write_bytes(raw)
    await log(lesson_id, "voice", "Muse Voice Transcribe is listening to your recording")
    narration = await voice.from_recording(src, rec_dir, language=lesson.language, keywords=lesson.key_terms)
    narration.audio = rel(rec_dir / f"{src.stem}.mp3")

    def apply(s: Scene):
        s.assets.narration = narration
        if narration.text:
            s.narration = narration.text
    await pipeline.update_scene(lesson_id, scene_id, apply)
    await log(lesson_id, "voice", f"Your voice is in: \"{narration.text[:80]}…\"", "ok")
    return store.load(lesson_id)


@app.post("/api/lessons/{lesson_id}/render")
async def render_video(lesson_id: str):
    lesson = _get(lesson_id)
    if lesson.status == "rendering":
        return lesson
    _spawn(render.render(lesson_id))
    async with Editor(lesson_id) as l:
        l.status, l.render_progress = "rendering", 0.0
    return store.load(lesson_id)


@app.post("/api/lessons/{lesson_id}/watch")
async def watch_video(lesson_id: str):
    """Ask Muse Spark to watch the latest MP4 again."""
    lesson = _get(lesson_id)
    if not lesson.video:
        raise HTTPException(400, "Export the MP4 first")
    _spawn(render.review(lesson_id))
    return {"ok": True}


@app.delete("/api/lessons/{lesson_id}")
def delete_lesson(lesson_id: str):
    import shutil
    _get(lesson_id)
    shutil.rmtree(folder(lesson_id), ignore_errors=True)
    return {"ok": True}
