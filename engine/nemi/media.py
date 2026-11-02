"""Illustrations (Muse Image) and labelled diagrams (Muse Spark locates, SAM 3.1 cuts out).

Image models garble text, so illustrations are drawn with no words at all.
For diagrams, Muse Spark looks at the picture and roughly boxes each part,
SAM 3.1 turns each box into a pixel-exact mask, and Remotion draws crisp
labels in the lesson's language on top."""

from io import BytesIO
from pathlib import Path

from PIL import Image
from pydantic import BaseModel

from . import meta, prompts
from .schema import Lesson, Region, Scene

NO_TEXT = "Absolutely no text, letters, numbers, labels, captions or watermarks anywhere in the image."


def image_size_for(kind: str, fmt: str) -> str:
    if fmt == "portrait":
        return "1024x1792" if kind == "hook" else "1024x1024"
    return "1792x1024" if kind == "hook" else "1536x1024"


async def illustrate(lesson: Lesson, scene: Scene, out: Path) -> tuple[int, int]:
    prompt = f"{scene.image_prompt}\nStyle: {lesson.art_direction}\n{NO_TEXT}"
    png = await meta.draw(prompt, image_size_for(scene.kind, lesson.format))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(png)
    return Image.open(BytesIO(png)).size


class _Loc(BaseModel):
    id: int
    box: list[int]
    point: list[int]


class _Locs(BaseModel):
    parts: list[_Loc]


def _overlap(a, b) -> float:
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    area = max(1, (a[2] - a[0]) * (a[3] - a[1]))
    return ix * iy / area


async def find_parts(scene: Scene, png: bytes, size: tuple[int, int]) -> list[Region]:
    w, h = size
    parts = scene.diagram_parts
    listing = "\n".join(f"{i}: {p.sam_prompt} (called \"{p.label}\": {p.note})" for i, p in enumerate(parts))
    locs = await meta.think_json(
        _Locs, system=prompts.LOCATOR, effort="low",
        content=[{"type": "input_text", "text": f"Parts (id: description):\n{listing}"}, meta.image_part(png)],
    )
    boxes: dict[int, tuple] = {}
    objects = []
    for loc in locs.parts:
        if not (0 <= loc.id < len(parts)) or len(loc.box) != 4 or loc.box[2] <= loc.box[0] or loc.box[3] <= loc.box[1]:
            continue
        box = (loc.box[0] * w // 1000, loc.box[1] * h // 1000,
               min(w, loc.box[2] * w // 1000), min(h, loc.box[3] * h // 1000))
        point = (min(w - 1, loc.point[0] * w // 1000), min(h - 1, loc.point[1] * h // 1000)) \
            if len(loc.point) == 2 and box[0] <= loc.point[0] * w // 1000 < box[2] else None
        boxes[loc.id] = box
        objects.append({"id": loc.id, "box": box, "point": point})

    masks = await meta.segment_objects(png, size, objects) if objects else {}

    regions = []
    for i, part in enumerate(parts):
        m = masks.get(str(i))
        if m is None and part.sam_prompt:
            # Fallback: ask SAM by concept and keep the mask that best overlaps Muse Spark's box
            candidates = await meta.segment(png, part.sam_prompt)
            if i in boxes and candidates:
                candidates.sort(key=lambda c: -_overlap(boxes[i], c["box"]))
            m = candidates[0] if candidates else None
        if m:
            regions.append(Region(label=part.label, note=part.note, found=True, path=m["path"],
                                  mask_size=m["mask_size"], box=m["box"], confidence=m["confidence"]))
        else:
            regions.append(Region(label=part.label, note=part.note, found=i in boxes,
                                  box=boxes.get(i, (0, 0, 0, 0))))
    return regions
