"""The teacher's own voice: a recording from the browser, transcribed with Muse Voice Transcribe.

Muse Voice Transcribe returns turn-level timestamps, not word-level ones, so
word timings for the captions are spread across each turn by word length."""

import asyncio
import subprocess
from pathlib import Path

from . import meta
from .schema import Narration, Word
from .tts import probe_duration


def _convert(src: Path, wav: Path, mp3: Path) -> None:
    # Muse Voice Transcribe wants mono 16-bit PCM WAV at 16 or 24 kHz
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                    "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(wav)], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                    "-af", "loudnorm=I=-16:TP=-1.5", "-b:a", "160k", str(mp3)], check=True)


def _spread_words(turns: list[dict], total: float) -> list[Word]:
    words: list[Word] = []
    for turn in turns:
        tokens = turn.get("transcript", "").split()
        if not tokens:
            continue
        start = turn.get("startMs", 0) / 1000
        end = min(turn.get("endMs", total * 1000) / 1000, total)
        weights = [len(t) + 2 for t in tokens]  # +2 ~ the gap between words
        span, acc = max(end - start, 0.1), 0
        for tok, w in zip(tokens, weights):
            a = start + span * acc / sum(weights)
            acc += w
            b = start + span * acc / sum(weights)
            words.append(Word(text=tok.strip(".,;:!?¿¡\"'"), start=round(a, 3), end=round(b, 3)))
    return words


async def from_recording(src: Path, out_dir: Path, *, language: str, keywords: list[str]) -> Narration:
    out_dir.mkdir(parents=True, exist_ok=True)
    wav, mp3 = out_dir / f"{src.stem}.wav", out_dir / f"{src.stem}.mp3"
    await asyncio.to_thread(_convert, src, wav, mp3)
    result = await meta.transcribe(wav.read_bytes(), language=language, keywords=keywords)
    duration = await asyncio.to_thread(probe_duration, mp3)
    turns = result.get("turns") or [{"transcript": result.get("transcript", ""),
                                     "startMs": 0, "endMs": duration * 1000}]
    text = result.get("transcript") or " ".join(t.get("transcript", "") for t in turns)
    return Narration(audio="", duration=duration, words=_spread_words(turns, duration),
                     voice="teacher", source="teacher", text=text.strip())
