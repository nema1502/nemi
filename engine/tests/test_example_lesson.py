"""The lesson the website ships must match the schema the engine writes, and stay plain."""

import json
import re
from pathlib import Path

from nemi.schema import Lesson

DEMO = Path(__file__).resolve().parents[2] / "apps" / "web" / "public" / "demo"


def test_example_lesson_matches_the_schema():
    lesson = Lesson.model_validate_json((DEMO / "lesson.json").read_text(encoding="utf-8"))
    assert lesson.id == "demo" and len(lesson.scenes) >= 5
    for s in lesson.scenes:
        assert s.assets.narration and s.assets.narration.words
        for path in (s.assets.image, s.assets.clip, s.assets.narration.audio):
            if path:
                assert (DEMO / Path(path).name).is_file(), path


def test_example_lesson_has_plain_punctuation():
    text = (DEMO / "lesson.json").read_text(encoding="utf-8")
    assert not re.search("[\\u00b7\\u00ab\\u00bb\\u2014\\u2013\\u2192\\u201c\\u201d]", text)


def test_every_diagram_part_has_a_mask():
    lesson = json.loads((DEMO / "lesson.json").read_text(encoding="utf-8"))
    diagrams = [s for s in lesson["scenes"] if s["kind"] == "diagram"]
    assert diagrams
    for s in diagrams:
        assert all(r["path"] for r in s["assets"]["regions"])
