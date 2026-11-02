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


def _key(token: str) -> str:
    return token.strip(".,;:!?¿¡\"'").lower()


def _spread_words(turns: list[dict], total: float) -> tuple[list[Word], str]:
    """Words with timings plus the spoken text, from turn-level timestamps.

    Turns can overlap at their edges (the end of one repeats at the start of the
    next), so repeated words at each boundary are dropped before joining."""
    words: list[Word] = []
    raw: list[str] = []
    for turn in turns:
        tokens = turn.get("transcript", "").split()
        if not tokens:
            continue
        start = turn.get("startMs", 0) / 1000
        end = min(turn.get("endMs", total * 1000) / 1000, total)
        weights = [len(tok) + 2 for tok in tokens]  # +2 ~ the gap between words
        span, acc = max(end - start, 0.1), 0
        timed = []
        for tok, w in zip(tokens, weights):
            a = start + span * acc / sum(weights)
            acc += w
            b = start + span * acc / sum(weights)
            timed.append((tok, Word(text=_key(tok) and tok.strip(".,;:!?¿¡\"'"), start=round(a, 3), end=round(b, 3))))
        # The later turn is the more final take of the shared edge: keep its version, drop the earlier one
        for k in range(min(len(raw), len(timed), 8), 0, -1):
            if [_key(x) for x in raw[-k:]] == [_key(tok) for tok, _ in timed[:k]]:
                raw, words = raw[:-k], words[:-k]
                break
        raw += [tok for tok, _ in timed]
        words += [w for _, w in timed]
    return words, " ".join(raw)


async def from_recording(src: Path, out_dir: Path, *, language: str, keywords: list[str]) -> Narration:
    out_dir.mkdir(parents=True, exist_ok=True)
    wav, mp3 = out_dir / f"{src.stem}.wav", out_dir / f"{src.stem}.mp3"
    await asyncio.to_thread(_convert, src, wav, mp3)
    result = await meta.transcribe(wav.read_bytes(), language=language, keywords=keywords)
    duration = await asyncio.to_thread(probe_duration, mp3)
    turns = result.get("turns") or [{"transcript": result.get("transcript", ""),
                                     "startMs": 0, "endMs": duration * 1000}]
    words, text = _spread_words(turns, duration)
    return Narration(audio="", duration=duration, words=words, voice="teacher", source="teacher", text=text.strip())
