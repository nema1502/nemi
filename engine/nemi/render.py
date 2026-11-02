"""Final MP4: the same Remotion composition the studio previews, rendered headless."""

import asyncio
import json
import subprocess
import time
from pathlib import Path

from . import config, store, watch
from .store import Editor, folder, log, rel

_slot = asyncio.Semaphore(1)


def _run(props_file, out, on_progress) -> None:
    proc = subprocess.Popen(["node", "render.mjs", str(props_file), str(out)], cwd=config.VIDEO_PKG,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8",
                            errors="replace")
    tail = []
    for line in proc.stdout:
        line = line.strip()
        if line.startswith("{"):
            try:
                on_progress(json.loads(line).get("progress", 0))
                continue
            except ValueError:
                pass
        tail = (tail + [line])[-30:]
    if proc.wait() != 0:
        raise RuntimeError("Remotion render failed:\n" + "\n".join(tail))


async def render(lesson_id: str) -> None:
    async with _slot:
        lesson = store.load(lesson_id)
        await log(lesson_id, "render", "Rendering the MP4 with Remotion")
        out = folder(lesson_id) / f"nemi-{lesson_id}-{int(time.time())}.mp4"
        props = folder(lesson_id) / "render-props.json"
        props.write_text(json.dumps({"lesson": lesson.model_dump(mode="json"), "assetBase": config.PUBLIC_URL,
                                     "captions": True}), encoding="utf-8")
        loop = asyncio.get_running_loop()
        last = [0.0]

        def on_progress(p: float):
            if p - last[0] >= 0.05 or p >= 1:
                last[0] = p
                asyncio.run_coroutine_threadsafe(_progress(lesson_id, p), loop)

        try:
            await asyncio.to_thread(_run, props, out, on_progress)
            async with Editor(lesson_id) as l:
                l.video, l.status, l.render_progress, l.video_review = rel(out), "ready", 1.0, None
            await log(lesson_id, "render", "MP4 ready to download", "ok")
        except Exception as e:
            async with Editor(lesson_id) as l:
                l.status, l.render_progress = "ready", None
            await log(lesson_id, "error", str(e)[-400:], "error")
            return
    await review(lesson_id)


async def review(lesson_id: str) -> None:
    """Muse Spark watches the finished video and leaves notes with timestamps."""
    lesson = store.load(lesson_id)
    if not lesson.video:
        return
    mp4 = folder(lesson_id).parent / Path(lesson.video).relative_to("files")
    await log(lesson_id, "watch", "Muse Spark is watching the whole video, picture and sound")
    try:
        r = await watch.review(lesson, mp4)
    except Exception as e:
        await log(lesson_id, "watch", f"Video review failed: {str(e)[:200]}", "warn")
        return
    async with Editor(lesson_id) as l:
        l.video_review = r
        l.review_scores = [*l.review_scores, r.score]
    major = sum(n.severity == "major" for n in r.notes)
    await log(lesson_id, "watch", f"Muse Spark watched the video: {r.score}/10, {len(r.notes)} notes"
                                  + (f" ({major} important)" if major else ""), "ok" if r.score >= 7 else "warn")


async def _progress(lesson_id: str, p: float) -> None:
    async with Editor(lesson_id) as l:
        l.render_progress = round(p, 3)
