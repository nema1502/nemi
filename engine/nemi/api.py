"""HTTP API for the web studio.  Run:  uvicorn nemi.api:app --port 8000"""

import asyncio
import time
from pathlib import Path
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, pipeline, render, store, voice
from . import events as ev
from .schema import THEMES, DiagramPartSpec, Lesson, QuizSpec, Scene
from .store import Editor, folder, log, rel
from .tts import VOICES

app = FastAPI(title="Nemi engine")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS + ["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/files", StaticFiles(directory=config.LESSONS), name="files")
app.mount("/event-files", StaticFiles(directory=ev.EVENTS), name="event-files")

_tasks: set[asyncio.Task] = set()

# A public demo spends Meta credits, so creation is capped per visitor and per day
PER_VISITOR_PER_HOUR = 8
PER_DAY = 150
_hits: dict[str, list[float]] = {}


def _visitor(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _limit(request: Request) -> None:
    now = time.time()
    mine = [t for t in _hits.get(_visitor(request), []) if now - t < 3600]
    everyone = [t for t in _hits.get("*", []) if now - t < 86400]
    if len(mine) >= PER_VISITOR_PER_HOUR:
        raise HTTPException(429, "You have created a lot in the last hour. Please try again in a little while.")
    if len(everyone) >= PER_DAY:
        raise HTTPException(429, "Nemi reached today's limit for the public demo. Please come back tomorrow.")
    _hits[_visitor(request)] = mine + [now]
    _hits["*"] = everyone + [now]


@app.get("/api/whoami")
def whoami(request: Request):
    return {"visitor": _visitor(request)}


INTERRUPTED = "The engine restarted while this was being made. Please create it again."


@app.on_event("startup")
def _mark_interrupted() -> None:
    """Jobs run inside this process; anything still marked as in progress at startup was cut off."""
    for lesson in store.all_lessons():
        if lesson.status in ("queued", "reading", "planning", "reviewing", "producing"):
            lesson.status, lesson.error = "error", INTERRUPTED
            store.save(lesson)
        elif lesson.status == "rendering":
            lesson.status, lesson.render_progress = "ready", None
            store.save(lesson)
    for path in ev.EVENTS.glob("*/kit.json"):
        try:
            kit = ev.EventKit.model_validate_json(path.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if kit.status in ("queued", "designing", "drawing"):
            kit.status, kit.error = "error", INTERRUPTED
            ev.save(kit)
        elif kit.status == "exporting":
            kit.status = "ready"
            ev.save(kit)


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
    request: Request,
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
    _limit(request)
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


# ---------------------------------------------------------------- Nemi for events

@app.post("/api/events")
async def create_event(
    request: Request,
    name: str = Form(...),
    date: str = Form(""),
    place: str = Form(""),
    description: str = Form(""),
    community: str = Form(""),
    language: str = Form("Spanish"),
    logos: list[UploadFile] = File(default=[]),
):
    import io

    from PIL import Image, UnidentifiedImageError

    _limit(request)
    kit = ev.EventKit(name=name.strip(), date=date.strip(), place=place.strip(), description=description.strip(),
                      community=community.strip(), language=language)
    folder_ = ev.folder(kit.id)
    folder_.mkdir(parents=True, exist_ok=True)
    pngs = []
    for i, f in enumerate(logos[:4]):
        raw = await f.read()
        if not raw:
            continue
        try:
            img = Image.open(io.BytesIO(raw)).convert("RGBA")
        except UnidentifiedImageError:
            raise HTTPException(400, f"{f.filename}: use PNG, JPG or WebP logos")
        img.thumbnail((1200, 1200))
        path = folder_ / f"logo-{i}.png"
        img.save(path)
        kit.logos.append(ev.rel(path))
        pngs.append(path.read_bytes())
    ev.save(kit)
    _spawn(ev.design(kit.id, pngs))
    return kit


@app.get("/api/events")
def list_events():
    kits = []
    for p in ev.EVENTS.glob("*/kit.json"):
        try:
            k = ev.EventKit.model_validate_json(p.read_text(encoding="utf-8"))
            kits.append({"id": k.id, "name": k.name, "status": k.status, "created_at": k.created_at, "key_visual": k.key_visual})
        except ValueError:
            continue
    return sorted(kits, key=lambda k: -k["created_at"])


@app.get("/api/events/{kit_id}")
def get_event(kit_id: str):
    if not ev.exists(kit_id):
        raise HTTPException(404, "kit not found")
    return ev.load(kit_id)


@app.post("/api/events/{kit_id}/export")
async def export_event(kit_id: str):
    if not ev.exists(kit_id):
        raise HTTPException(404, "kit not found")
    kit = ev.load(kit_id)
    if kit.status != "ready":
        raise HTTPException(409, "The kit is still being made")
    _spawn(ev.export(kit_id))
    return {"ok": True}
