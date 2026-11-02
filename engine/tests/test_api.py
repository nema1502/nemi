"""The HTTP API the web studio and the student link talk to. Nothing here reaches Meta or starts a pipeline."""

import time

import pytest
from fastapi.testclient import TestClient

from nemi import api, config, store
from nemi import events as ev
from nemi.schema import Lesson, QuizSpec, Scene


@pytest.fixture
def data(tmp_path, monkeypatch):
    """Lessons and event kits live in tmp_path, so the startup hook never touches the real data folder."""
    monkeypatch.setattr(config, "LESSONS", tmp_path / "lessons")
    monkeypatch.setattr(ev, "EVENTS", tmp_path / "events")
    config.LESSONS.mkdir()
    ev.EVENTS.mkdir()
    monkeypatch.setattr(api, "_hits", {})
    return tmp_path


@pytest.fixture
def jobs(monkeypatch):
    """What the endpoints would start in the background, recorded instead of run."""
    started = []
    monkeypatch.setattr(api.pipeline, "create", lambda lesson_id, **kw: ("create", lesson_id))
    monkeypatch.setattr(api, "_spawn", started.append)
    return started


@pytest.fixture
def client(data, jobs):
    with TestClient(api.app) as c:
        yield c


def scene(id, kind, quiz=None):
    return Scene(id=id, kind=kind, act="proof", title="T", narration="Hola.", points=[], image_prompt=None,
                 latex=[], quiz=quiz, diagram_parts=[], manim_brief=None)


def quiz_lesson() -> Lesson:
    lesson = Lesson(status="ready", scenes=[
        scene("c1", "concept"),
        scene("q1", "quiz", QuizSpec(question="?", options=["a", "b", "c"], answer_index=2, explanation="c")),
        scene("q2", "quiz", QuizSpec(question="?", options=["a", "b"], answer_index=0, explanation="a")),
    ])
    store.save(lesson)
    return lesson


def answer(client, lesson_id, scene_id, picked, student="Ana"):
    return client.post(f"/api/lessons/{lesson_id}/answers",
                       json={"student": student, "scene_id": scene_id, "picked": picked})


def stored(lesson_id):
    return [(a.student, a.scene_id, a.picked, a.correct) for a in store.load(lesson_id).answers]


# ---------------------------------------------------------------- quiz answers


def test_answers_are_recorded_and_scored(client):
    lesson = quiz_lesson()
    assert answer(client, lesson.id, "q1", 2).json() == {"correct": True}
    assert answer(client, lesson.id, "q1", 0, student="Luis").json() == {"correct": False}
    assert stored(lesson.id) == [("Ana", "q1", 2, True), ("Luis", "q1", 0, False)]


def test_a_second_answer_replaces_the_first(client):
    lesson = quiz_lesson()
    answer(client, lesson.id, "q1", 0)
    answer(client, lesson.id, "q2", 0)
    assert answer(client, lesson.id, "q1", 2).json() == {"correct": True}  # Ana watches again
    assert stored(lesson.id) == [("Ana", "q2", 0, True), ("Ana", "q1", 2, True)]


def test_student_names_are_normalized(client):
    lesson = quiz_lesson()
    answer(client, lesson.id, "q1", 0, student="  Ana \t  Maria  ")
    answer(client, lesson.id, "q1", 1, student="Ana Maria")  # same student, so it replaces the first
    answer(client, lesson.id, "q2", 0, student="x" * 100)
    client.post(f"/api/lessons/{lesson.id}/answers", json={"scene_id": "q1", "picked": 2})  # no name at all
    assert stored(lesson.id) == [("Ana Maria", "q1", 1, False), ("x" * 40, "q2", 0, True),
                                 ("Anonymous", "q1", 2, True)]


def test_students_without_a_name_count_one_by_one(client):
    # The student page sends a per-device label ("Estudiante 4821") when the name is left empty;
    # a truly blank name is one anonymous student, whose second answer replaces the first
    lesson = quiz_lesson()
    answer(client, lesson.id, "q1", 2, student="Estudiante 4821")
    answer(client, lesson.id, "q1", 0, student="Estudiante 1307")
    assert len(store.load(lesson.id).answers) == 2
    answer(client, lesson.id, "q1", 2, student="")
    answer(client, lesson.id, "q1", 0, student="   ")
    assert len(store.load(lesson.id).answers) == 3


def test_bad_answers_are_rejected_and_not_stored(client):
    lesson = quiz_lesson()
    assert answer(client, lesson.id, "nope", 0).status_code == 400
    assert answer(client, lesson.id, "c1", 0).status_code == 400  # not a quiz
    assert answer(client, lesson.id, "q1", 3).status_code == 400
    assert answer(client, lesson.id, "q1", -1).status_code == 400
    assert client.post(f"/api/lessons/{lesson.id}/answers", json={"picked": 0}).status_code == 422
    assert answer(client, "no-such-lesson", "q1", 0).status_code == 404
    assert store.load(lesson.id).answers == []


# ---------------------------------------------------------------- creating lessons and the rate limit


def create(client, ip, topic="Volcanes"):
    return client.post("/api/lessons", data={"topic": topic}, headers={"x-forwarded-for": ip})


def test_creating_a_lesson_saves_it_and_starts_the_pipeline(client, jobs):
    r = create(client, "203.0.113.1", topic="  Volcanes  ")
    assert r.status_code == 200
    lesson = store.load(r.json()["id"])
    assert (lesson.topic, lesson.status) == ("Volcanes", "queued")
    assert jobs == [("create", lesson.id)]


def test_a_lesson_needs_a_topic_or_a_pdf(client, jobs):
    assert client.post("/api/lessons").status_code == 400
    assert client.post("/api/lessons", data={"topic": "   "}).status_code == 400
    assert jobs == [] and store.all_lessons() == []
    assert api._hits == {}  # a rejected request does not use up the visitor's quota


def test_each_visitor_has_an_hourly_limit(client, jobs):
    for _ in range(api.PER_VISITOR_PER_HOUR):
        assert create(client, "203.0.113.1").status_code == 200
    r = create(client, "203.0.113.1")
    assert r.status_code == 429
    assert "try again" in r.json()["detail"]
    assert len(jobs) == api.PER_VISITOR_PER_HOUR  # the refused request started nothing
    assert len(store.all_lessons()) == api.PER_VISITOR_PER_HOUR


def test_visitors_are_told_apart_by_the_first_forwarded_ip(client):
    for i in range(api.PER_VISITOR_PER_HOUR):
        assert create(client, f"203.0.113.1, 10.0.0.{i}").status_code == 200  # same visitor, other proxies
    assert create(client, "203.0.113.1, 10.0.0.99").status_code == 429
    assert create(client, "198.51.100.7, 10.0.0.1").status_code == 200


def test_old_hits_fall_out_of_the_hourly_window(client):
    api._hits["203.0.113.1"] = [time.time() - 3700] * api.PER_VISITOR_PER_HOUR
    assert create(client, "203.0.113.1").status_code == 200
    assert len(api._hits["203.0.113.1"]) == 1


def test_the_whole_demo_has_a_daily_limit(client, monkeypatch):
    monkeypatch.setattr(api, "PER_DAY", 3)
    for i in range(3):
        assert create(client, f"203.0.113.{i}").status_code == 200
    r = create(client, "198.51.100.7")
    assert r.status_code == 429
    assert "today" in r.json()["detail"]


# ---------------------------------------------------------------- lookups


def test_unknown_lesson_and_event_kit_are_404(client):
    assert client.get("/api/lessons/nope").status_code == 404
    assert client.get("/api/events/nope").status_code == 404


def test_whoami_echoes_the_forwarded_ip(client):
    assert client.get("/api/whoami", headers={"x-forwarded-for": "203.0.113.9, 10.0.0.1"}).json() == \
        {"visitor": "203.0.113.9"}
    assert client.get("/api/whoami").json() == {"visitor": "testclient"}  # no proxy: the socket address


# ---------------------------------------------------------------- startup


def test_startup_marks_unfinished_work_as_interrupted(data):
    for status in ("queued", "producing", "rendering", "ready", "error"):
        store.save(Lesson(id=status, status=status, render_progress=0.4 if status == "rendering" else None))
    for status in ("drawing", "exporting", "ready"):
        ev.save(ev.EventKit(id=f"ev-{status}", name="Meetup", status=status))
    with TestClient(api.app):
        pass
    lessons = {l.id: l for l in store.all_lessons()}
    assert {i: (l.status, l.error) for i, l in lessons.items()} == {
        "queued": ("error", api.INTERRUPTED), "producing": ("error", api.INTERRUPTED),
        "rendering": ("ready", None), "ready": ("ready", None), "error": ("error", None)}
    assert lessons["rendering"].render_progress is None
    assert [(ev.load(f"ev-{s}").status, ev.load(f"ev-{s}").error) for s in ("drawing", "exporting", "ready")] == \
        [("error", api.INTERRUPTED), ("ready", None), ("ready", None)]
