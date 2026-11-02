"""Closing the loop: Muse Spark fixes what it noticed when it watched the video.

    watch the MP4  ->  notes pinned to the minute  ->  map each minute to its scene
    ->  Muse Spark rewrites only what the notes ask for  ->  re-voice, redraw
    ->  render again  ->  watch again, and keep both scores."""

import asyncio
import math

from pydantic import BaseModel, Field

from . import meta, pipeline, render, store
from .schema import Lesson, Scene
from .store import Editor, log
from .typography import clean, clean_all

# Same timing as packages/video/src/timing.ts, so a note's minute lands on the right scene
FPS, LEAD, TAIL, THINK = 30, 0.35, 0.65, 8
MIN_SECONDS = {"hook": 4, "concept": 4, "image": 4, "diagram": 6, "formula": 5, "manim": 4, "quiz": 4, "summary": 5}


def _estimate(text: str) -> float:
    return max(1.5, len(text.split()) / 2.6)


def scene_ranges(lesson: Lesson) -> list[tuple[Scene, float, float]]:
    t, out = 0.0, []
    for s in lesson.scenes:
        voice = s.assets.narration.duration if s.assets.narration else _estimate(s.narration)
        total = LEAD + voice + TAIL
        if s.kind == "quiz" and s.quiz:
            reveal = s.assets.reveal.duration if s.assets.reveal else _estimate(s.quiz.explanation)
            total = LEAD + voice + 0.3 + THINK + reveal + 1.2
        if s.kind == "manim" and s.assets.clip_duration:
            total = max(total, s.assets.clip_duration + 0.2)
        total = math.ceil(max(total, MIN_SECONDS[s.kind]) * FPS) / FPS
        out.append((s, t, t + total))
        t += total
    return out


def _mmss(sec: float) -> str:
    return f"{int(sec // 60)}:{int(sec % 60):02d}"


class SceneFix(BaseModel):
    scene_id: str
    why: str = Field(description="which note this answers, in a few words")
    title: str | None
    narration: str | None
    points: list[str] | None
    image_prompt: str | None = Field(description="only when the picture contradicts the narration; no text in it")
    latex: list[str] | None = Field(description="formula scenes only: the KaTeX steps, one short line each")


class FixPlan(BaseModel):
    fixes: list[SceneFix]


SYSTEM = """You are the director of a short lesson video. A teacher watched it and left notes pinned to minutes.
Fix every note that the lesson's content can fix, and nothing else:
- Each note's time tells you which scene it is about (scene time ranges are given).
- You may change a scene's title, narration (what the voice says), points (short on-screen lines),
  image_prompt (never ask for text in the picture) or, in a formula scene, its latex steps.
- Formula steps are KaTeX math: short lines that fit the screen, words inside \\text{...} and symbols
  like \\rightarrow outside it. Split a long step into two.
- When the picture and the voice disagree, change the image_prompt so the picture shows what the voice says,
  or change the narration to match the picture, whichever is simpler for the student.
- When something confuses the audience (a misleading title, a loose metaphor), remove or replace it.
  Don't add an explanation of it.
- When the voice names places or things the screen doesn't show, put them in the on-screen points, or say less.
- Leave a field null when it doesn't change. Keep the scene's kind, its language and its role in the story.
- Narration stays spoken and short, about 2.5 words per second; points stay under 7 words.
- Correct spelling with every accent of the language. Plain punctuation: no em dashes, guillemets or middle dots.
- Notes about the player itself (for example the quiz countdown) can't be fixed in the lesson: skip them.
Return one fix per affected scene, at most 5."""


async def improve(lesson_id: str) -> None:
    lesson = store.load(lesson_id)
    review = lesson.video_review
    if not review or not review.notes:
        return
    try:
        await log(lesson_id, "fix", f"Muse Spark is fixing its {len(review.notes)} notes")
        ranges = scene_ranges(lesson)
        scenes = "\n".join(
            f"Scene {i} [{s.id}] {s.kind}, {_mmss(a)} to {_mmss(b)}. Title: {s.title}. Voice: {s.narration}. "
            f"On screen: {' / '.join(s.points) or '-'}. Picture: {s.image_prompt or '-'}"
            + (f". LaTeX steps: {' | '.join(s.latex)}" if s.kind == "formula" else "")
            for i, (s, a, b) in enumerate(ranges, 1))
        notes = "\n".join(f"- {n.time} ({n.severity}): {n.issue} Suggested fix: {n.fix}" for n in review.notes)
        plan = await meta.think_json(
            FixPlan, system=SYSTEM, effort="high",
            content=[{"type": "input_text", "text": f"Lesson: {lesson.title}. Audience: {lesson.audience}. "
                                                    f"Language: {lesson.language}.\n\nScenes:\n{scenes}\n\nNotes:\n{notes}"}],
        )
        by_id = {s.id: s for s in lesson.scenes}
        fixes = [f for f in plan.fixes if f.scene_id in by_id][:5]
        if not fixes:
            await log(lesson_id, "fix", "Nothing in the notes can be fixed inside the lesson", "warn")
            return

        revoice, redraw = [], []
        async with Editor(lesson_id) as l:
            for f in fixes:
                s = next(x for x in l.scenes if x.id == f.scene_id)
                if f.title:
                    s.title = clean(f.title)
                if f.narration and f.narration.strip() != s.narration.strip():
                    s.narration = clean(f.narration)
                    revoice.append(s.id)
                if f.points is not None and s.kind in ("concept", "image", "summary"):
                    s.points = clean_all([p for p in f.points if p.strip()][:4])
                if f.latex and s.kind == "formula":
                    s.latex = [x.strip() for x in f.latex if x.strip()][:4]
                if f.image_prompt and s.kind in ("hook", "image", "diagram"):
                    s.image_prompt = clean(f.image_prompt)
                    s.assets.image = None
                    redraw.append(s.id)
        for f in fixes:
            await log(lesson_id, "fix", f"{by_id[f.scene_id].title}: {clean(f.why)}", "ok")

        jobs = [pipeline.narrate(lesson_id, sid) for sid in revoice] + [pipeline.draw(lesson_id, sid) for sid in redraw]
        await asyncio.gather(*jobs)
        for sid in redraw:
            if by_id[sid].kind == "diagram":
                await pipeline.locate_parts(lesson_id, sid)
        await log(lesson_id, "fix", f"{len(fixes)} scenes fixed. Rendering again so Muse Spark can watch the new version", "ok")
        async with Editor(lesson_id) as l:
            l.status, l.render_progress = "rendering", 0.0
        await render.render(lesson_id)
    except Exception as e:
        async with Editor(lesson_id) as l:
            if l.status == "rendering":
                l.status = "ready"
        await log(lesson_id, "error", f"Fixing failed: {str(e)[:200]}", "error")
