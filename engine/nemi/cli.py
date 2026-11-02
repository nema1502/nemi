"""Make a lesson from the terminal:  python -m nemi.cli "topic" [--pdf file.pdf] [--audience ...]"""

import argparse
import asyncio
from pathlib import Path

from . import pipeline, store
from .schema import THEMES, Lesson


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("topic", nargs="?", default="")
    ap.add_argument("--pdf")
    ap.add_argument("--audience", default="10-year-old students")
    ap.add_argument("--language", default="Spanish")
    ap.add_argument("--voice", default="es-BO-SofiaNeural")
    ap.add_argument("--length", default="short", choices=["short", "standard", "long"])
    ap.add_argument("--format", default="landscape", choices=["landscape", "portrait"])
    ap.add_argument("--theme", default="night", choices=list(THEMES))
    a = ap.parse_args()

    pdf = (Path(a.pdf).read_bytes(), Path(a.pdf).name) if a.pdf else None
    lesson = Lesson(topic=a.topic, audience=a.audience, language=a.language, voice=a.voice,
                    format=a.format, theme=THEMES[a.theme], source_name=pdf[1] if pdf else None)
    store.save(lesson)
    print("lesson", lesson.id)
    asyncio.run(pipeline.create(lesson.id, length=a.length, pdf=pdf))
    done = store.load(lesson.id)
    for e in done.events:
        print(f"[{e.level}] {e.step}: {e.message[:200]}")
    print("status:", done.status, "| scenes:", [s.kind for s in done.scenes])


if __name__ == "__main__":
    main()
