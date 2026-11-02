"""Narration with edge-tts, keeping word-level timings for karaoke captions.

Meta Model API has no speech synthesis, so the default voice is edge-tts; the
teacher can replace any scene with their own recording (see voice.py)."""

import asyncio
import subprocess
from pathlib import Path

import edge_tts

from .schema import Narration, Word

VOICES = {
    "Spanish": ["es-BO-MarceloNeural", "es-BO-SofiaNeural", "es-MX-DaliaNeural", "es-MX-JorgeNeural",
                "es-PE-CamilaNeural", "es-PE-AlexNeural", "es-CO-SalomeNeural", "es-CO-GonzaloNeural",
                "es-AR-ElenaNeural", "es-AR-TomasNeural", "es-ES-ElviraNeural", "es-ES-AlvaroNeural"],
    "English": ["en-US-AvaMultilingualNeural", "en-US-AndrewMultilingualNeural", "en-US-EmmaNeural",
                "en-US-BrianNeural"],
    "Portuguese": ["pt-BR-FranciscaNeural", "pt-BR-AntonioNeural", "pt-BR-ThalitaMultilingualNeural"],
}

_TICKS = 10_000_000  # edge-tts offsets are in 100 ns units
_slots = asyncio.Semaphore(4)


async def speak(text: str, voice: str, out_mp3: Path, rate: str = "+0%") -> Narration:
    words: list[Word] = []
    audio = bytearray()
    async with _slots:
        comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / _TICKS
                words.append(Word(text=chunk["text"], start=round(start, 3),
                                  end=round(start + chunk["duration"] / _TICKS, 3)))
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    out_mp3.write_bytes(bytes(audio))
    duration = await asyncio.to_thread(probe_duration, out_mp3)
    return Narration(audio="", duration=duration, words=words, voice=voice, source="tts", text=text)


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return round(float(out), 3)
