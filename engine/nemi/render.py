"""Final MP4: the same Remotion composition the studio previews, rendered headless."""

import asyncio
import json
import subprocess
import time

from . import config, store
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
                l.video, l.status, l.render_progress = rel(out), "ready", 1.0
            await log(lesson_id, "render", "MP4 ready to download", "ok")
        except Exception as e:
            async with Editor(lesson_id) as l:
                l.status, l.render_progress = "ready", None
            await log(lesson_id, "error", str(e)[-400:], "error")


async def _progress(lesson_id: str, p: float) -> None:
    async with Editor(lesson_id) as l:
        l.render_progress = round(p, 3)
