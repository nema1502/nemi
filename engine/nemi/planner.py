"""Director -> reviewer -> reviser: Muse Spark plans the lesson, then checks it
against the 7 questions before anything is produced."""

from . import config, meta, prompts
from .schema import LessonPlanSpec, ReviewSpec


def _request(topic: str, audience: str, has_pdf: bool) -> str:
    if has_pdf:
        ask = f"Make a lesson from the attached document. Teacher's note: {topic}" if topic \
            else "Make a lesson from the attached document."
    else:
        ask = f"Make a lesson about: {topic}"
    return f"{ask}\nStudents: {audience}"


def _content(text: str, pdf: tuple[bytes, str] | None) -> list[dict]:
    parts = [meta.pdf_part(*pdf)] if pdf else []
    return parts + [{"type": "input_text", "text": text}]


async def plan(*, topic: str, audience: str, language: str, length: str,
               pdf: tuple[bytes, str] | None, on_thought) -> LessonPlanSpec:
    return await meta.think_json(
        LessonPlanSpec,
        system=prompts.director(language=language, audience=audience, length=length, from_document=bool(pdf)),
        content=_content(_request(topic, audience, bool(pdf)), pdf),
        model=config.PLANNER_MODEL, effort="high", on_thought=on_thought,
    )


async def review(plan_: LessonPlanSpec, *, audience: str, language: str,
                 pdf: tuple[bytes, str] | None) -> ReviewSpec:
    return await meta.think_json(
        ReviewSpec,
        system=prompts.reviewer(language=language, audience=audience),
        content=_content(f"Lesson plan to review:\n{plan_.model_dump_json(indent=1)}", pdf),
        effort="medium",
    )


async def revise(plan_: LessonPlanSpec, review_: ReviewSpec, *, topic: str, audience: str, language: str,
                 length: str, pdf: tuple[bytes, str] | None, on_thought) -> LessonPlanSpec:
    notes = [f"- {c.question}: {c.verdict.upper()} — {c.reason}. Fix: {c.fix}"
             for c in review_.checks if c.verdict != "yes"]
    notes += [f"- Fact issue: {f}" for f in review_.fact_issues]
    system = prompts.director(language=language, audience=audience, length=length, from_document=bool(pdf))
    return await meta.think_json(
        LessonPlanSpec,
        system=system + "\n\n" + prompts.reviser(),
        content=_content(
            f"{_request(topic, audience, bool(pdf))}\n\nCurrent plan:\n{plan_.model_dump_json(indent=1)}"
            f"\n\nReviewer notes:\n" + "\n".join(notes), pdf),
        model=config.PLANNER_MODEL, effort="medium", on_thought=on_thought,
    )


def needs_revision(r: ReviewSpec) -> bool:
    return bool(r.fact_issues) or any(c.verdict != "yes" for c in r.checks)


def tidy(p: LessonPlanSpec) -> LessonPlanSpec:
    """Guard rails on what the model returned, so the renderer never gets an impossible scene."""
    manims = 0
    for s in p.scenes:
        s.points = [x for x in s.points if x.strip()][:4]
        if s.quiz:
            s.quiz.options = s.quiz.options[:4]
            s.quiz.answer_index = min(max(s.quiz.answer_index, 0), len(s.quiz.options) - 1)
        if s.kind == "quiz" and not (s.quiz and len(s.quiz.options) >= 2):
            s.kind = "concept"
        if s.kind in ("hook", "image", "diagram") and not s.image_prompt:
            s.kind = "concept"
        if s.kind == "diagram":
            s.diagram_parts = s.diagram_parts[:5]
            if len(s.diagram_parts) < 2:
                s.kind = "image"
        if s.kind == "formula" and not s.latex:
            s.kind = "concept"
        if s.kind == "manim":
            manims += 1
            if manims > 2 or not s.manim_brief:
                s.kind = "concept"
    return p
