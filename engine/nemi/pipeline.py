"""The lesson agent: read -> plan -> review -> revise -> produce every scene in parallel."""

import asyncio
import hashlib
import traceback
from collections.abc import Callable
from pathlib import Path

from . import manim_agent, media, planner, store, tts
from .schema import Lesson, Scene, new_scene_id
from .store import Editor, folder, log, rel


def _tag(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:8]


async def update_scene(lesson_id: str, scene_id: str, fn: Callable[[Scene], None]) -> None:
    async with Editor(lesson_id) as lesson:
        for s in lesson.scenes:
            if s.id == scene_id:
                fn(s)


def _scene(lesson_id: str, scene_id: str) -> tuple[Lesson, Scene]:
    lesson = store.load(lesson_id)
    return lesson, next(s for s in lesson.scenes if s.id == scene_id)


async def set_status(lesson_id: str, status: str, **fields) -> None:
    async with Editor(lesson_id) as lesson:
        lesson.status = status
        for k, v in fields.items():
            setattr(lesson, k, v)


def _model_name(model_id: str) -> str:
    return "Muse Wonder" if "wonder" in model_id else "Muse Spark"


# ---------------------------------------------------------------- whole lesson

async def create(lesson_id: str, *, length: str, pdf: tuple[bytes, str] | None) -> None:
    lesson = store.load(lesson_id)
    try:
        async def thought(text: str):
            await log(lesson_id, "think", text)

        if pdf:
            await set_status(lesson_id, "reading")
            await log(lesson_id, "read", f"{_model_name(lesson.planner)} is reading {pdf[1]}")
        await set_status(lesson_id, "planning")
        await log(lesson_id, "plan", f"{_model_name(lesson.planner)} is planning the lesson in five acts")
        common = dict(audience=lesson.audience, language=lesson.language, pdf=pdf)
        plan = await planner.plan(topic=lesson.topic, length=length, on_thought=thought, model=lesson.planner, **common)
        await log(lesson_id, "plan", f"Draft ready: {len(plan.scenes)} scenes, \"{plan.title}\"", "ok")

        await set_status(lesson_id, "reviewing")
        await log(lesson_id, "review", "Checking the draft against the 7 questions")
        review = await planner.review(plan, **common)
        passed = sum(c.verdict == "yes" for c in review.checks)
        await log(lesson_id, "review", f"{passed}/{len(review.checks)} checks passed, "
                                       f"{len(review.fact_issues)} fact issues",
                  "ok" if not planner.needs_revision(review) else "warn")
        if planner.needs_revision(review):
            await log(lesson_id, "review", "Revising the plan with the reviewer's notes")
            plan = await planner.revise(plan, review, topic=lesson.topic, length=length,
                                        on_thought=thought, model=lesson.planner, **common)
            await log(lesson_id, "review", "Plan revised", "ok")
        plan = await planner.proofread(planner.tidy(plan), lesson.language)

        async with Editor(lesson_id) as l:
            l.title, l.subtitle = plan.title, plan.subtitle
            l.objectives, l.key_terms, l.art_direction = plan.objectives, plan.key_terms, plan.art_direction
            l.review = review
            l.scenes = [Scene(id=new_scene_id(i), **s.model_dump()) for i, s in enumerate(plan.scenes)]
            l.status = "producing"

        await produce_all(lesson_id)
        await set_status(lesson_id, "ready")
        await log(lesson_id, "done", "Lesson ready to preview", "ok")
    except Exception as e:
        traceback.print_exc()
        await set_status(lesson_id, "error", error=str(e)[:500])
        await log(lesson_id, "error", f"{type(e).__name__}: {str(e)[:300]}", "error")


async def produce_all(lesson_id: str) -> None:
    lesson = store.load(lesson_id)
    # The opening picture is drawn first: every other illustration uses it as its style reference
    hook = next((s for s in lesson.scenes if s.kind == "hook" and s.image_prompt), None)
    if hook and not hook.assets.image:
        try:
            await draw(lesson_id, hook.id)
        except Exception as e:
            await log(lesson_id, "image", f"Opening picture failed: {str(e)[:150]}", "warn")
    results = await asyncio.gather(*(produce_scene(lesson_id, s.id) for s in lesson.scenes),
                                   return_exceptions=True)
    for s, r in zip(lesson.scenes, results):
        if isinstance(r, Exception):
            traceback.print_exception(r)
            await log(lesson_id, "error", f"Scene \"{s.title}\": {type(r).__name__}: {str(r)[:200]}", "warn")


async def produce_scene(lesson_id: str, scene_id: str) -> None:
    _, scene = _scene(lesson_id, scene_id)
    jobs = [narrate(lesson_id, scene_id)]
    if scene.kind in ("hook", "image", "diagram") and not scene.assets.image:
        jobs.append(draw(lesson_id, scene_id))
    await asyncio.gather(*jobs)
    if scene.kind == "diagram":
        await locate_parts(lesson_id, scene_id)
    if scene.kind == "manim":
        await animate(lesson_id, scene_id)


# ---------------------------------------------------------------- one scene

async def narrate(lesson_id: str, scene_id: str) -> None:
    lesson, scene = _scene(lesson_id, scene_id)
    audio_dir = folder(lesson_id) / "audio"
    main_mp3 = audio_dir / f"{scene_id}-{_tag(scene.narration, lesson.voice)}.mp3"
    main = await tts.speak(scene.narration, lesson.voice, main_mp3)
    main.audio = rel(main_mp3)
    reveal = None
    if scene.kind == "quiz" and scene.quiz:
        q = scene.quiz
        text = f"{q.options[q.answer_index]}. {q.explanation}"
        rev_mp3 = audio_dir / f"{scene_id}-reveal-{_tag(text, lesson.voice)}.mp3"
        reveal = await tts.speak(text, lesson.voice, rev_mp3)
        reveal.audio = rel(rev_mp3)

    def apply(s: Scene):
        s.assets.narration = main
        s.assets.reveal = reveal
    await update_scene(lesson_id, scene_id, apply)


async def draw(lesson_id: str, scene_id: str) -> None:
    lesson, scene = _scene(lesson_id, scene_id)
    out = folder(lesson_id) / "img" / f"{scene_id}-{_tag(scene.image_prompt or '', lesson.art_direction)}.png"
    hook = next((s for s in lesson.scenes if s.kind == "hook" and s.assets.image), None)
    reference = None
    if hook and hook.id != scene_id:
        reference = (folder(lesson_id).parent / Path(hook.assets.image).relative_to("files")).read_bytes()
    await log(lesson_id, "image", f"Muse Image is drawing \"{scene.title}\""
                                  + (" in the style of the opening scene" if reference else ""))
    size = await media.illustrate(lesson, scene, out, reference)

    def apply(s: Scene):
        s.assets.image, s.assets.image_size = rel(out), size
        s.assets.regions = []
    await update_scene(lesson_id, scene_id, apply)
    await log(lesson_id, "image", f"Illustration ready: \"{scene.title}\"", "ok")


async def locate_parts(lesson_id: str, scene_id: str) -> None:
    lesson, scene = _scene(lesson_id, scene_id)
    if not scene.assets.image or not scene.assets.image_size:
        return
    png = (store.folder(lesson_id).parent / Path(scene.assets.image).relative_to("files")).read_bytes()
    await log(lesson_id, "sam", f"Muse Spark + SAM 3.1 are finding {len(scene.diagram_parts)} parts "
                                f"in \"{scene.title}\"")
    regions = await media.find_parts(scene, png, tuple(scene.assets.image_size))
    found = sum(r.path != "" for r in regions)

    def apply(s: Scene):
        s.assets.regions = regions
    await update_scene(lesson_id, scene_id, apply)
    await log(lesson_id, "sam", f"SAM 3.1 cut out {found}/{len(regions)} parts",
              "ok" if found == len(regions) else "warn")


async def animate(lesson_id: str, scene_id: str) -> None:
    lesson, scene = _scene(lesson_id, scene_id)
    await log(lesson_id, "manim", f"Muse Spark is writing a Manim animation: \"{scene.title}\"")

    async def on_step(n: int, errors: list[str], warnings: list[str], last: bool):
        if n == -1:
            await log(lesson_id, "manim", "Vision check: " + ("frames look right" if not errors
                      else f"{len(errors)} issue(s), repairing"), "ok" if not errors else "warn")
        elif errors and last:
            await log(lesson_id, "manim", f"Auditor pass {n}: {len(errors)} error(s) left, rendering the "
                                          f"best version", "warn")
        elif errors:
            await log(lesson_id, "manim", f"Auditor pass {n}: {len(errors)} error(s), Muse Spark is repairing",
                      "warn")
        else:
            await log(lesson_id, "manim", f"Auditor pass {n}: clean ({len(warnings)} warnings). Rendering…",
                      "ok")

    work = folder(lesson_id) / "manim" / scene_id
    clip, clip_duration, attempts = await manim_agent.animate(lesson, scene, work, on_step)

    def apply(s: Scene):
        s.assets.clip, s.assets.clip_duration, s.assets.manim_attempts = rel(clip), clip_duration, attempts
    await update_scene(lesson_id, scene_id, apply)
    await log(lesson_id, "manim", f"Animation ready: \"{scene.title}\" ({clip_duration:.1f}s)", "ok")
