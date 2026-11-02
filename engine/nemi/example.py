"""Publish a finished lesson as a read-only example on the website:

    python -m nemi.example <lesson_id> <slug>

Writes apps/web/public/<slug>/ with lesson.json and its assets, so the example plays even when the engine is cold.
The slug must start with "demo" (the web app treats those ids as read-only examples).
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

from . import store
from .config import LESSONS

PUBLIC = Path(__file__).resolve().parents[2] / "apps" / "web" / "public"


def publish(lesson_id: str, slug: str) -> Path:
    assert slug.startswith("demo"), "example ids start with 'demo'"
    lesson = store.load(lesson_id)
    src = LESSONS / lesson_id
    out = PUBLIC / slug
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    prefix = f"files/{lesson_id}/"

    def move(path: str) -> str:
        file = src / path.removeprefix(prefix)
        if file.suffix == ".png":
            # Illustrations as JPEG: a tenth of the size and no visible difference in the player
            name = file.with_suffix(".jpg").name
            Image.open(file).convert("RGB").save(out / name, quality=86, optimize=True)
        else:
            name = file.name
            shutil.copy(file, out / name)
        return f"/{slug}/{name}"

    def walk(v):
        if isinstance(v, str) and v.startswith(prefix):
            return move(v)
        if isinstance(v, list):
            return [walk(x) for x in v]
        if isinstance(v, dict):
            return {k: walk(x) for k, x in v.items()}
        return v

    data = lesson.model_dump(mode="json")
    data["scenes"] = walk(data["scenes"])
    data.update(id=slug, video=None, render_progress=None, answers=[], class_insight=None)
    (out / "lesson.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return out


if __name__ == "__main__":
    folder = publish(sys.argv[1], sys.argv[2])
    size = sum(f.stat().st_size for f in folder.iterdir()) / 1e6
    print(f"{folder} ({len(list(folder.iterdir()))} files, {size:.1f} MB)")
