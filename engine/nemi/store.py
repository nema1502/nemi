"""Lessons live as plain folders: data/lessons/<id>/lesson.json plus their assets."""

import asyncio
import time
from collections import defaultdict
from pathlib import Path

from . import config
from .schema import Event, Lesson
from .typography import clean

_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


def folder(lesson_id: str) -> Path:
    return config.LESSONS / lesson_id


def rel(path: Path) -> str:
    """Path as served under /files."""
    return "files/" + path.relative_to(config.LESSONS).as_posix()


def load(lesson_id: str) -> Lesson:
    return Lesson.model_validate_json((folder(lesson_id) / "lesson.json").read_text(encoding="utf-8"))


def exists(lesson_id: str) -> bool:
    return (folder(lesson_id) / "lesson.json").is_file()


def save(lesson: Lesson) -> None:
    f = folder(lesson.id)
    f.mkdir(parents=True, exist_ok=True)
    tmp = f / "lesson.json.tmp"
    tmp.write_text(lesson.model_dump_json(indent=1), encoding="utf-8")
    tmp.replace(f / "lesson.json")


def all_lessons() -> list[Lesson]:
    out = []
    for p in config.LESSONS.glob("*/lesson.json"):
        try:
            out.append(Lesson.model_validate_json(p.read_text(encoding="utf-8")))
        except ValueError:
            continue
    return sorted(out, key=lambda l: -l.created_at)


class Editor:
    """Read-modify-write a lesson under its lock, so parallel pipeline steps don't clobber each other.

        async with Editor(id) as lesson:
            lesson.title = "..."
    """

    def __init__(self, lesson_id: str):
        self.id = lesson_id

    async def __aenter__(self) -> Lesson:
        await _locks[self.id].acquire()
        self.lesson = load(self.id)
        return self.lesson

    async def __aexit__(self, exc_type, exc, tb):
        try:
            if exc_type is None:
                save(self.lesson)
        finally:
            _locks[self.id].release()


async def log(lesson_id: str, step: str, message: str, level: str = "info") -> None:
    async with Editor(lesson_id) as lesson:
        lesson.events.append(Event(t=time.time(), step=step, message=clean(message), level=level))
