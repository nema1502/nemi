"""Nemi Classroom: quiz answers from the student link, and what Muse Spark suggests to reteach."""

import time

from . import meta
from .schema import Answer, ClassInsight, Lesson
from .store import Editor, log
from .typography import clean, clean_all

MAX_ANSWERS = 2000


async def record(lesson_id: str, student: str, scene_id: str, picked: int) -> Answer:
    async with Editor(lesson_id) as lesson:
        scene = next((s for s in lesson.scenes if s.id == scene_id and s.quiz), None)
        if scene is None or not 0 <= picked < len(scene.quiz.options):
            raise ValueError("unknown quiz or option")
        name = " ".join(student.split())[:40] or "Anonymous"
        answer = Answer(student=name, scene_id=scene_id, picked=picked,
                        correct=picked == scene.quiz.answer_index, t=time.time())
        # One answer per student and question: watching again replaces it
        lesson.answers = [a for a in lesson.answers if not (a.student == name and a.scene_id == scene_id)]
        lesson.answers = (lesson.answers + [answer])[-MAX_ANSWERS:]
        return answer


def _report(lesson: Lesson) -> str:
    lines = []
    for s in lesson.scenes:
        if not s.quiz:
            continue
        got = [a for a in lesson.answers if a.scene_id == s.id]
        if not got:
            continue
        counts = [sum(a.picked == i for a in got) for i in range(len(s.quiz.options))]
        options = ", ".join(f"{o}: {c}" + (" (right)" if i == s.quiz.answer_index else "")
                            for i, (o, c) in enumerate(zip(s.quiz.options, counts)))
        lines.append(f"Question: {s.quiz.question}\nAnswers: {options}")
    students = sorted({a.student for a in lesson.answers})
    return f"{len(students)} students answered.\n\n" + "\n\n".join(lines)


async def insight(lesson_id: str) -> None:
    from . import store
    lesson = store.load(lesson_id)
    if not lesson.answers:
        return
    await log(lesson_id, "class", "Muse Spark is reading the class results")
    try:
        r = await meta.think_json(
            ClassInsight, effort="low",
            system=(f"You help a teacher after a lesson. Audience: {lesson.audience}. Write in {lesson.language} with "
                    "correct spelling and accents, plainly and kindly, in the teacher's voice. Base everything on the "
                    "answers: say which ideas the class got and which wrong option many students chose, and why that "
                    "mistake is common. Plain punctuation: no em dashes, guillemets or middle dots."),
            content=[{"type": "input_text", "text": f"Lesson: {lesson.title}\n\n{_report(lesson)}"}],
        )
        fixed = clean_all(await meta.respell([r.summary, *r.reteach, r.warmup_question], lesson.language))
        r.summary, r.reteach, r.warmup_question = fixed[0], fixed[1:-1], fixed[-1]
        async with Editor(lesson_id) as l:
            l.class_insight = r
        await log(lesson_id, "class", "Muse Spark suggested what to reteach", "ok")
    except Exception as e:
        await log(lesson_id, "class", f"Class insight failed: {clean(str(e))[:200]}", "warn")
