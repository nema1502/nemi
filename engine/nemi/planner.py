"""Director -> reviewer -> reviser: Muse Spark plans the lesson, then checks it
against the 7 questions before anything is produced."""

from . import config, meta, prompts
from .schema import LessonPlanSpec, ReviewSpec
from .typography import clean, clean_all


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
               pdf: tuple[bytes, str] | None, on_thought, model: str = config.PLANNER_MODEL) -> LessonPlanSpec:
    return await meta.think_json(
        LessonPlanSpec,
        system=prompts.director(language=language, audience=audience, length=length, from_document=bool(pdf)),
        content=_content(_request(topic, audience, bool(pdf)), pdf),
        model=model, effort="high", on_thought=on_thought,
    )


async def review(plan_: LessonPlanSpec, *, audience: str, language: str,
                 pdf: tuple[bytes, str] | None) -> ReviewSpec:
    r = await meta.think_json(
        ReviewSpec,
        system=prompts.reviewer(language=language, audience=audience),
        content=_content(f"Lesson plan to review:\n{plan_.model_dump_json(indent=1)}", pdf),
        effort="medium",
    )
    for c in r.checks:
        c.reason, c.fix = clean(c.reason), clean(c.fix)
    r.fact_issues = clean_all(r.fact_issues)
    return r


async def revise(plan_: LessonPlanSpec, review_: ReviewSpec, *, topic: str, audience: str, language: str,
                 length: str, pdf: tuple[bytes, str] | None, on_thought,
                 model: str = config.PLANNER_MODEL) -> LessonPlanSpec:
    notes = [f"- {c.question}: {c.verdict.upper()}. {c.reason}. Fix: {c.fix}"
             for c in review_.checks if c.verdict != "yes"]
    notes += [f"- Fact issue: {f}" for f in review_.fact_issues]
    system = prompts.director(language=language, audience=audience, length=length, from_document=bool(pdf))
    return await meta.think_json(
        LessonPlanSpec,
        system=system + "\n\n" + prompts.reviser(),
        content=_content(
            f"{_request(topic, audience, bool(pdf))}\n\nCurrent plan:\n{plan_.model_dump_json(indent=1)}"
            f"\n\nReviewer notes:\n" + "\n".join(notes), pdf),
        model=model, effort="medium", on_thought=on_thought,
    )


def needs_revision(r: ReviewSpec) -> bool:
    return bool(r.fact_issues) or any(c.verdict != "yes" for c in r.checks)


async def proofread(p: LessonPlanSpec, language: str) -> LessonPlanSpec:
    """Captions show the narration exactly as written, so questions need their marks before the voice reads them."""
    fields: list[tuple[object, str]] = [(p, "title"), (p, "subtitle")]
    for s in p.scenes:
        fields += [(s, "title"), (s, "narration")]
        if s.quiz:
            fields += [(s.quiz, "question"), (s.quiz, "explanation")]
    fixed = clean_all(await meta.question_marks([getattr(o, f) for o, f in fields], language))
    for (o, f), text in zip(fields, fixed):
        setattr(o, f, text)
    return p


def tidy(p: LessonPlanSpec) -> LessonPlanSpec:
    """Guard rails on what the model returned, so the renderer never gets an impossible scene."""
    p.title, p.subtitle = clean(p.title), clean(p.subtitle)
    p.objectives, p.key_terms = clean_all(p.objectives), clean_all(p.key_terms)
    manims = 0
    for s in p.scenes:
        s.title, s.narration = clean(s.title), clean(s.narration)
        s.image_prompt, s.manim_brief = clean(s.image_prompt), clean(s.manim_brief)
        s.points = clean_all([x for x in s.points if x.strip()][:4])
        if s.quiz:
            s.quiz.question, s.quiz.explanation = clean(s.quiz.question), clean(s.quiz.explanation)
            s.quiz.options = clean_all(s.quiz.options)
        for part in s.diagram_parts:
            part.label, part.note = clean(part.label), clean(part.note)
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
