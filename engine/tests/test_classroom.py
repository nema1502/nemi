import asyncio
import shutil

import pytest

from nemi import classroom, store
from nemi.schema import Lesson, QuizSpec, Scene


@pytest.fixture
def lesson():
    quiz = Scene(id="q1", kind="quiz", act="proof", title="Quiz", narration="¿Cuál?", points=[], image_prompt=None,
                 latex=[], quiz=QuizSpec(question="¿Cuál?", options=["a", "b", "c"], answer_index=1, explanation="b"),
                 diagram_parts=[], manim_brief=None)
    l = Lesson(id="test-classroom", scenes=[quiz])
    store.save(l)
    yield l
    shutil.rmtree(store.folder(l.id), ignore_errors=True)


def test_answers_are_scored_and_replaced_per_student(lesson):
    async def run():
        assert (await classroom.record(lesson.id, "Ana", "q1", 1)).correct
        assert not (await classroom.record(lesson.id, "  Luis  ", "q1", 0)).correct
        await classroom.record(lesson.id, "Luis", "q1", 1)  # Luis watches again and gets it right
    asyncio.run(run())
    answers = store.load(lesson.id).answers
    assert [(a.student, a.correct) for a in answers] == [("Ana", True), ("Luis", True)]


def test_unknown_quiz_or_option_is_rejected(lesson):
    with pytest.raises(ValueError):
        asyncio.run(classroom.record(lesson.id, "Ana", "q1", 7))
    with pytest.raises(ValueError):
        asyncio.run(classroom.record(lesson.id, "Ana", "nope", 0))
