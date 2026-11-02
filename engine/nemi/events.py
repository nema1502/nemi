"""Nemi for events: a launch kit for a hackathon, meetup or community chapter.

Muse Spark reads the logos and writes the brand and the copy, Muse Image draws
one key visual with no text, SAM 3.1 cuts out its main character, and the
Remotion compositions in packages/video/src/events lay real text and the real
logos over it in every format."""

import asyncio
import io
import json
import subprocess
import time
import traceback
import uuid
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Literal

from meta_sam_parser import decode_mask_to_raster
from PIL import Image, ImageFilter
from pydantic import BaseModel, Field

from . import config, media, meta
from .schema import Event
from .typography import clean, clean_all

EVENTS = config.DATA / "events"
EVENTS.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- what Muse Spark writes


class Palette(BaseModel):
    bg: str = Field(description="dark background hex")
    primary: str = Field(description="main brand hex, taken from the logos")
    secondary: str = Field(description="second brand hex")
    accent: str = Field(description="bright highlight hex")
    ink: str = Field(description="text hex, readable on bg")


class Copies(BaseModel):
    instagram: str
    x: str = Field(description="under 260 characters")
    linkedin: str
    whatsapp: str = Field(description="message for community groups")
    luma: str = Field(description="event description for the Luma page")


class DesignSpec(BaseModel):
    palette: Palette
    art_direction: str
    key_visual_prompt: str = Field(description="portrait scene, no text, one clear main character in the middle")
    subject: str = Field(description="short English noun phrase for that main character, e.g. 'astronaut'")


class WordsSpec(BaseModel):
    tagline: str = Field(description="max 8 words")
    copies: Copies
    grid_captions: list[str] = Field(description="9 captions, one per grid post, in posting order")
    story_lines: list[str] = Field(description="3 lines of at most 5 words: save the date, registrations open, last call")


class EventKitSpec(BaseModel):
    tagline: str = Field(description="max 8 words")
    palette: Palette
    art_direction: str
    key_visual_prompt: str = Field(description="portrait scene, no text, one clear main character in the middle")
    subject: str = Field(description="short English noun phrase for that main character, e.g. 'astronaut'")
    copies: Copies
    grid_captions: list[str] = Field(description="9 captions, one per grid post, in posting order")
    story_lines: list[str] = Field(description="3 lines of at most 5 words: save the date, registrations open, last call")


# ---------------------------------------------------------------- the kit


class EventKit(BaseModel):
    id: str = Field(default_factory=lambda: "ev" + uuid.uuid4().hex[:8])
    created_at: float = Field(default_factory=time.time)
    status: Literal["queued", "designing", "drawing", "ready", "exporting", "error"] = "queued"
    name: str
    date: str = ""
    place: str = ""
    description: str = ""
    community: str = ""
    language: str = "Spanish"
    logos: list[str] = []
    spec: EventKitSpec | None = None
    key_visual: str | None = None
    key_visual_size: tuple[int, int] | None = None
    cutout: str | None = None
    cutout_box: tuple[float, float, float, float] | None = None  # where the cutout sits in the key visual, 0-1
    download: str | None = None
    events: list[Event] = []
    error: str | None = None


_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


def folder(kit_id: str) -> Path:
    return EVENTS / kit_id


def rel(path: Path) -> str:
    return "event-files/" + path.relative_to(EVENTS).as_posix()


def load(kit_id: str) -> EventKit:
    return EventKit.model_validate_json((folder(kit_id) / "kit.json").read_text(encoding="utf-8"))


def exists(kit_id: str) -> bool:
    return (folder(kit_id) / "kit.json").is_file()


def save(kit: EventKit) -> None:
    f = folder(kit.id)
    f.mkdir(parents=True, exist_ok=True)
    tmp = f / "kit.json.tmp"
    tmp.write_text(kit.model_dump_json(indent=1), encoding="utf-8")
    tmp.replace(f / "kit.json")


async def update(kit_id: str, fn) -> None:
    async with _locks[kit_id]:
        kit = load(kit_id)
        fn(kit)
        save(kit)


async def log(kit_id: str, step: str, message: str, level: str = "info") -> None:
    await update(kit_id, lambda k: k.events.append(Event(t=time.time(), step=step, message=clean(message), level=level)))


# ---------------------------------------------------------------- the agent

DESIGNER = """You are the brand designer of a community tech event (a hackathon, a meetup, a community chapter).
From the organizer's notes and their logos, design a launch kit that feels like one campaign.

- palette: take the main colors from the logos; bg must be dark enough for light text, ink must be readable on it.
- key_visual_prompt: one portrait illustration (3:4) for the whole campaign. A clear main character or object
  in the middle third, the top quarter calm (sky or plain background) because the event name goes there.
  Never ask for text, letters, numbers or logos in the picture: the real logos are added on top later.
- subject: a short English noun phrase for that main character, so a segmentation model can find it.
- copies: ready to post, in the event's language, in the voice of the organizers. Include date and place.
  Instagram and LinkedIn can be a few short paragraphs; X under 260 characters; WhatsApp friendly and short.
  At most two emojis per post. Correct spelling with every accent of the language (sábado, not sabado).
  Plain punctuation: no em dashes, guillemets or middle dots.
- grid_captions: 9 short captions for the 9 posts of an Instagram grid that forms one big picture.
- story_lines: 3 lines of at most 5 words each (save the date, registrations open, last call)."""


async def design(kit_id: str, logos: list[bytes]) -> None:
    kit = load(kit_id)
    try:
        await update(kit_id, lambda k: setattr(k, "status", "designing"))
        await log(kit_id, "plan", "Muse Spark is reading your logos and designing the campaign")
        notes = (f"Event: {kit.name}\nDate: {kit.date}\nPlace: {kit.place}\nCommunity or technology: {kit.community}\n"
                 f"Language: {kit.language}\nAbout: {kit.description}")
        content = [{"type": "input_text", "text": notes}] + [meta.image_part(b) for b in logos[:4]]

        async def thought(t: str):
            await log(kit_id, "think", t)

        # Design and words are separate calls: mixed with English design fields, the copy lost its accents
        design_, words = await asyncio.gather(
            meta.think_json(DesignSpec, system=DESIGNER, content=content, effort="medium", on_thought=thought),
            meta.think_json(WordsSpec, system=DESIGNER, content=[{"type": "input_text", "text": notes}], effort="medium"),
        )
        spec = EventKitSpec(**design_.model_dump(), **words.model_dump())
        spec.tagline = clean(spec.tagline)
        spec.grid_captions = clean_all((spec.grid_captions + [""] * 9)[:9])
        spec.story_lines = clean_all((spec.story_lines + ["", "", ""])[:3])
        for k in ("instagram", "x", "linkedin", "whatsapp", "luma"):
            setattr(spec.copies, k, clean(getattr(spec.copies, k)))

        def put_spec(k: EventKit):
            k.spec, k.status = spec, "drawing"
        await update(kit_id, put_spec)
        await log(kit_id, "plan", f"Campaign ready: \"{spec.tagline}\"", "ok")

        await log(kit_id, "image", "Muse Image is drawing the key visual")
        p = spec.palette
        png = await meta.draw(
            f"{spec.key_visual_prompt}\nStyle: {spec.art_direction}. Color palette: {p.bg}, {p.primary}, {p.secondary}, "
            f"{p.accent}.\nAbsolutely no text, letters, numbers, logos or watermarks anywhere in the image.",
            "1536x2048")
        kv = folder(kit_id) / "key-visual.png"
        kv.write_bytes(png)
        size = Image.open(io.BytesIO(png)).size

        def put_kv(k: EventKit):
            k.key_visual, k.key_visual_size = rel(kv), size
        await update(kit_id, put_kv)
        await log(kit_id, "image", "Key visual ready", "ok")

        await log(kit_id, "sam", f"SAM 3.1 is cutting out the {spec.subject}")
        mask = await media.cut_out(png, size, spec.subject)
        if mask:
            cut_png, box = await asyncio.to_thread(_cutout, png, mask)
            out = folder(kit_id) / "cutout.png"
            out.write_bytes(cut_png)

            def put_cut(k: EventKit):
                k.cutout, k.cutout_box = rel(out), box
            await update(kit_id, put_cut)
            await log(kit_id, "sam", f"SAM 3.1 cut out the {spec.subject}", "ok")
        else:
            await log(kit_id, "sam", f"SAM 3.1 did not find a clear {spec.subject}; using the full picture", "warn")

        await update(kit_id, lambda k: setattr(k, "status", "ready"))
        await log(kit_id, "done", "Your kit is ready", "ok")
    except Exception as e:
        traceback.print_exc()

        def fail(k: EventKit):
            k.status, k.error = "error", str(e)[:400]
        await update(kit_id, fail)
        await log(kit_id, "error", f"{type(e).__name__}: {str(e)[:300]}", "error")


def _cutout(png: bytes, mask: dict) -> tuple[bytes, tuple[float, float, float, float]]:
    """Transparent PNG of the masked subject, cropped to its box. -> (png bytes, box as 0-1 fractions)."""
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    w, h = img.size
    l, t, r, b = (int(round(v)) for v in mask["box"])
    mw, mh = mask["mask_size"]
    raster = decode_mask_to_raster(mask["raw"])
    alpha = Image.frombytes("L", (mw, mh), bytes(255 if v else 0 for v in raster)).resize((r - l, b - t), Image.LANCZOS)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.6))  # soft edge, no halo
    crop = img.crop((l, t, r, b))
    crop.putalpha(alpha)
    buf = io.BytesIO()
    crop.save(buf, "PNG")
    return buf.getvalue(), (l / w, t / h, r / w, b / h)


# ---------------------------------------------------------------- export

POSTING_NOTE = {
    "Spanish": "Publica las imágenes en orden: post-1 primero y post-9 al final. Así tu perfil muestra la imagen completa.",
    "English": "Post the images in order: post-1 first and post-9 last. Your profile grid then shows the full picture.",
}


def _node(props: Path, out: Path, composition: str, mode: str, frame: int = 0) -> None:
    subprocess.run(["node", "render.mjs", str(props), str(out), composition, mode, str(frame)],
                   cwd=config.VIDEO_PKG, capture_output=True, text=True, check=True, timeout=900)


def _tiles(grid: Path, out_dir: Path) -> list[Path]:
    """Cut the big picture into 9 posts. Instagram shows the newest post top-left, so post 1 is bottom-right."""
    img = Image.open(grid)
    tw, th = img.width // 3, img.height // 3
    paths = []
    for n in range(9):
        cell = 8 - n  # post 1 -> cell 8 (bottom-right) ... post 9 -> cell 0 (top-left)
        x, y = (cell % 3) * tw, (cell // 3) * th
        p = out_dir / f"instagram-post-{n + 1}.png"
        img.crop((x, y, x + tw, y + th)).save(p)
        paths.append(p)
    return paths


def _copies(kit: EventKit) -> str:
    c, s = kit.spec.copies, kit.spec
    captions = "\n".join(f"Post {i + 1}: {t}" for i, t in enumerate(s.grid_captions))
    return (f"{kit.name}\n{s.tagline}\n\n== Instagram ==\n{c.instagram}\n\n== X ==\n{c.x}\n\n== LinkedIn ==\n{c.linkedin}\n\n"
            f"== WhatsApp ==\n{c.whatsapp}\n\n== Luma ==\n{c.luma}\n\n== Grid captions ==\n{captions}\n\n"
            f"{POSTING_NOTE.get(kit.language, POSTING_NOTE['English'])}\n")


async def export(kit_id: str) -> None:
    kit = load(kit_id)
    try:
        await update(kit_id, lambda k: setattr(k, "status", "exporting"))
        await log(kit_id, "render", "Remotion is rendering every format")
        out = folder(kit_id) / "kit"
        out.mkdir(parents=True, exist_ok=True)
        props = folder(kit_id) / "props.json"
        props.write_text(json.dumps({"kit": kit.model_dump(mode="json"), "assetBase": config.PUBLIC_URL, "line": 1}),
                         encoding="utf-8")
        jobs = [("EventGrid", "still", 0, "grid-full.png"), ("EventCover", "still", 0, "luma-cover.png"),
                ("EventAvatar", "still", 0, "profile-picture.png"), ("EventStory", "still", 200, "story.png"),
                ("EventStory", "video", 0, "story-and-whatsapp-status.mp4")]
        for comp, mode, frame, name in jobs:
            await asyncio.to_thread(_node, props, out / name, comp, mode, frame)
        await asyncio.to_thread(_tiles, out / "grid-full.png", out)
        (out / "copies.txt").write_text(_copies(kit), encoding="utf-8")

        zip_path = folder(kit_id) / f"{kit_id}-kit.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for f in sorted(out.iterdir()):
                z.write(f, f.name)

        def done(k: EventKit):
            k.status, k.download = "ready", rel(zip_path)
        await update(kit_id, done)
        await log(kit_id, "render", "Kit ready to download: 9 grid posts, cover, profile picture, story and copy", "ok")
    except Exception as e:
        traceback.print_exc()
        await update(kit_id, lambda k: setattr(k, "status", "ready"))
        err = getattr(e, "stderr", "") or str(e)
        await log(kit_id, "error", f"Export failed: {err[-300:]}", "error")
