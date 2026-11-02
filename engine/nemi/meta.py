"""Thin wrappers over Meta Model API: Muse Spark, Muse Image, SAM 3.1, Muse Voice Transcribe."""

from __future__ import annotations

import base64
import json
import re
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx
from meta_sam_parser import (
    FramePrompt,
    PromptBox,
    PromptObject,
    PromptPoint,
    build_object_prompt,
    decode_mask_to_svg_path,
    image_segmentation_format,
    parse_responses_stream,
)
from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from . import config

client = AsyncOpenAI(base_url=config.META_BASE_URL, api_key=config.MODEL_API_KEY or "not-set",
                     timeout=600, max_retries=3)

T = TypeVar("T", bound=BaseModel)
OnThought = Callable[[str], Awaitable[None]] | None


def data_url(raw: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(raw).decode()}"


def pdf_part(raw: bytes, filename: str) -> dict:
    return {"type": "input_file", "filename": filename, "file_data": data_url(raw, "application/pdf")}


def image_part(raw: bytes, mime: str = "image/png") -> dict:
    return {"type": "input_image", "image_url": data_url(raw, mime)}


async def think_json(
    model_cls: type[T],
    *,
    system: str,
    content: list[dict],
    model: str = config.PLANNER_MODEL,
    effort: str = "medium",
    max_output_tokens: int = 32000,
    on_thought: OnThought = None,
) -> T:
    """Responses API call constrained to `model_cls`'s JSON schema.

    Streams so the reasoning summaries can be shown live in the studio, and
    retries once with the validation error if the output doesn't parse.
    """
    schema = model_cls.model_json_schema()
    messages: list[dict] = [{"role": "user", "content": content}]
    last_error = ""
    for _ in range(2):
        if last_error:
            messages.append({"role": "user", "content": [{"type": "input_text", "text":
                f"Your previous output failed validation: {last_error}. Return the corrected JSON."}]})
        stream = await client.responses.create(
            model=model,
            instructions=system,
            input=messages,
            reasoning={"effort": effort, "summary": "concise"},
            text={"format": {"type": "json_schema", "name": model_cls.__name__, "schema": schema}},
            max_output_tokens=max_output_tokens,
            stream=True,
        )
        text, thought = "", ""
        async for event in stream:
            if event.type == "response.reasoning_summary_text.delta":
                thought += event.delta
            elif event.type == "response.reasoning_summary_part.done" and thought.strip():
                if on_thought:
                    await on_thought(thought.strip())
                thought = ""
            elif event.type == "response.output_text.delta":
                text += event.delta
        try:
            return model_cls.model_validate_json(text)
        except ValidationError as e:
            last_error = str(e)[:2000]
            messages.append({"role": "assistant", "content": text})
    raise RuntimeError(f"{model_cls.__name__}: model output did not validate: {last_error}")


async def think_text(*, system: str, content: list[dict], model: str = config.CODER_MODEL,
                     effort: str = "medium", max_output_tokens: int = 32000) -> str:
    resp = await client.responses.create(
        model=model, instructions=system,
        input=[{"role": "user", "content": content}],
        reasoning={"effort": effort}, max_output_tokens=max_output_tokens,
    )
    return resp.output_text


async def respell(texts: list[str], language: str) -> list[str]:
    """Structured output sometimes comes back without accents; a free-text proofreading pass puts them back.
    Returns the originals if anything looks off (different length, not a list of strings)."""
    if not texts:
        return texts
    ask = (f"Fix only spelling and missing accents in these {language} texts. Do not change wording, order or "
           "punctuation (except adding the opening question and exclamation marks Spanish needs), and keep regional words as written (Latin American 'video' stays 'video'). Return only a "
           "JSON array of strings with the same length and order.\n"
           + json.dumps(texts, ensure_ascii=False))
    try:
        out = await think_text(system="You are a careful proofreader.", content=[{"type": "input_text", "text": ask}],
                               model=config.CODER_MODEL, effort="low", max_output_tokens=8000)
        fixed = json.loads(re.search(r"\[.*\]", out, re.S).group(0))
        if isinstance(fixed, list) and len(fixed) == len(texts) and all(isinstance(x, str) for x in fixed):
            return fixed
    except Exception:
        pass
    return texts


async def question_marks(texts: list[str], language: str) -> list[str]:
    """Plans often write a spoken question with a period. Captions show the narration as written, so the marks go back
    in before the voice reads it. Only punctuation may change: a line whose letters changed is kept as it was."""
    if not texts:
        return texts
    ask = (f"These are {language} lines a narrator reads to students. Wherever a sentence asks something, make it end "
           "with a question mark; in Spanish also open it with the inverted question mark, and open exclamations with "
           "the inverted exclamation mark. Change nothing else: not a letter, not an accent, not a word. Return only a "
           "JSON array of strings with the same length and order.\n" + json.dumps(texts, ensure_ascii=False))
    try:
        out = await think_text(system="You are a careful proofreader.", content=[{"type": "input_text", "text": ask}],
                               model=config.CODER_MODEL, effort="low", max_output_tokens=8000)
        fixed = json.loads(re.search(r"\[.*\]", out, re.S).group(0))
    except Exception:
        return texts
    if not (isinstance(fixed, list) and len(fixed) == len(texts) and all(isinstance(x, str) for x in fixed)):
        return texts
    letters = lambda s: re.sub(r"\W", "", s).lower()
    return [f if letters(f) == letters(o) else o for f, o in zip(fixed, texts)]


# ---------------------------------------------------------------- Files API

async def upload_file(raw: bytes, filename: str, mime: str) -> str:
    f = await client.files.create(file=(filename, raw, mime), purpose="user_data")
    return f.id


async def delete_file(file_id: str) -> None:
    try:
        await client.files.delete(file_id)
    except Exception:
        pass  # storage is cleaned up eventually; a failed delete must not fail the review


# ---------------------------------------------------------------- Muse Image

async def draw(prompt: str, size: str) -> bytes:
    resp = await client.images.generate(model=config.IMAGE_MODEL, prompt=prompt, n=1,
                                        size=size, output_format="png")
    return base64.b64decode(resp.data[0].b64_json)


async def draw_like(prompt: str, size: str, reference_png: bytes) -> bytes:
    """A new picture in the style (and with the characters) of a reference image."""
    resp = await client.images.edit(model=config.IMAGE_MODEL, prompt=prompt, n=1, size=size,
                                    image=("reference.png", reference_png, "image/png"))
    return base64.b64decode(resp.data[0].b64_json)


# ---------------------------------------------------------------- SAM 3.1

async def segment(image_png: bytes, concept: str) -> list[dict]:
    """Find every instance of `concept` (a short noun phrase) in the image. Best match first."""
    return await _sam(image_png, concept)


async def segment_objects(image_png: bytes, size: tuple[int, int], objects: list[dict]) -> dict[str, dict]:
    """Refine rough boxes into exact masks. objects: [{id, box: (l,t,r,b), point: (x,y)}] in image px."""
    prompt = build_object_prompt(size=size, objects=[
        PromptObject(id=o["id"], prompts=[FramePrompt(
            box=PromptBox(*[int(v) for v in o["box"]]),
            points=[PromptPoint(int(o["point"][0]), int(o["point"][1]))] if o.get("point") else (),
        )]) for o in objects
    ])
    return {m["object_id"]: m for m in await _sam(image_png, prompt)}


async def _sam(image_png: bytes, text: str) -> list[dict]:
    stream = await client.responses.create(
        model=config.SAM_MODEL,
        input=[{"type": "message", "role": "user", "content": [
            {"type": "input_text", "text": text},
            image_part(image_png),
        ]}],
        metadata={"include_confidence": "true"},
        stream=True,
    )
    parsed = parse_responses_stream(stream, image_segmentation_format())
    async for _ in parsed:
        pass
    result = await parsed.final_result()
    boxes = {r.object_id: r for r in result.records if r.kind == "box"}
    found = []
    for rec in result.records:
        if rec.kind != "mask":
            continue
        b = rec.bounds
        found.append({
            "object_id": str(rec.object_id),
            "raw": rec.mask,
            "path": decode_mask_to_svg_path(rec.mask),
            "mask_size": (rec.mask.width, rec.mask.height),
            "box": (b.left, b.top, b.right, b.bottom),
            "confidence": rec.confidence if rec.confidence is not None
            else getattr(boxes.get(rec.object_id), "confidence", None),
        })
    found.sort(key=lambda m: -(m["confidence"] or 0))
    return found


# ---------------------------------------------------------------- Muse Voice Transcribe

async def transcribe(wav: bytes, *, language: str, keywords: list[str]) -> dict:
    request = {
        "mode": "ENDPOINTING",
        "model": config.ASR_MODEL,
        "audioEncoding": "WAV",
        "languageBias": [language],
        "keywords": keywords[:50],
    }
    async with httpx.AsyncClient(timeout=300) as http:
        r = await http.post(
            f"{config.META_BASE_URL}/asr/transcribe",
            headers={"Authorization": f"Bearer {config.MODEL_API_KEY}"},
            files={
                "request": (None, json.dumps(request), "application/json"),
                "audio": ("voice.wav", wav, "audio/wav"),
            },
        )
        r.raise_for_status()
        return r.json()
