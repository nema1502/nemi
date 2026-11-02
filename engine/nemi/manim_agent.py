"""A verifiable Manim agent.

    Muse Spark writes the scene  ->  the nemaxyz geometry auditor dry-runs it
    ->  errors go back to Muse Spark  ->  render  ->  Muse Spark looks at the
    frames  ->  one more repair if something is visibly wrong.

The auditor (engine/motor/auditor/auditar.py) is pre-existing; the loop that
lets a model write, check and repair its own animation is new."""

import asyncio
import re
import subprocess
from functools import cache
from pathlib import Path

from pydantic import BaseModel

from . import config, meta
from .schema import Lesson, ManimAttempt, Narration, Scene
from .tts import probe_duration

MAX_AUDITS = 3
_render_slots = asyncio.Semaphore(2)


@cache
def _coder_system() -> str:
    m = config.MOTOR
    icons = ", ".join(sorted(p.stem for p in (m / "comun" / "iconos").glob("*.svg")))
    return f"""You write Manim Community Edition (v0.22) scenes using the nemaxyz-motor style library.
You produce ONE Python module that renders ONE scene, for an educational video.

Hard rules:
- Follow the module skeleton you are given exactly (imports, sys.path line, configuration, class name).
- Never use Text(...) directly: use texto(), pastilla(), tarjeta(), check_item() from comun.estilo,
  and close wide groups with encajar(). MathTex/Tex are allowed for math (LaTeX is installed).
- Do NOT call marca_agua(), firma() or barra_progreso(): the video player adds branding and progress.
- Connectors only with conectar(); keep a reference to every arrow and fade it out.
  conectar() aims at the target's BOUNDING BOX, so only connect rectangular things (texto, pastilla,
  tarjeta, Rectangle, RoundedRectangle). To label a round or irregular shape (Circle, Ellipse, Polygon),
  put a small Dot exactly on its edge (shape.point_from_proportion(t)) and connect to that Dot, or
  place the label right next to the shape with no connector.
- Icons only via icono(name) with these names: {icons}. No other files, no ImageMobject, no SVGs from disk.
- Keep everything inside the safe zone. All on-screen text in the lesson's language.
- The animation must last DURACION_TOTAL seconds: time your self.play/self.wait so each step lands on the
  narration beat it illustrates (beats are given in seconds). End with a short hold, not a fade to empty.
- Return only the module, inside one ```python code block.

=== comun/estilo.py (the library) ===
{(m / 'comun' / 'estilo.py').read_text(encoding='utf-8')}

=== plantillas/plantilla_presentacion.py (a reference scene) ===
{(m / 'plantillas' / 'plantilla_presentacion.py').read_text(encoding='utf-8')}

=== MEJORES_PRACTICAS_MANIM.md (rules learned from real bugs) ===
{(m / 'MEJORES_PRACTICAS_MANIM.md').read_text(encoding='utf-8')}
"""


def _skeleton(lesson: Lesson, cls: str, duration: float) -> str:
    t = lesson.theme
    conf = "configurar_vertical" if lesson.format == "portrait" else "configurar_horizontal"
    return f'''import sys
sys.path.insert(0, r"{config.MOTOR}")

from manim import *
from comun.estilo import *

FONDO = "{t.bg}"
TINTA = "{t.ink}"
SUAVE = "{t.muted}"
ACENTO = "{t.accent}"
ACENTO_2 = "{t.accent2}"
ACENTO_3 = "{t.accent3}"
BIEN = "{t.good}"
MAL = "{t.bad}"

{conf}(FONDO)

DURACION_TOTAL = {duration:.1f}


class {cls}(Scene):
    def construct(self):
        ...
'''


def beats(narration: Narration | None, offset: float) -> str:
    """Sentence start times, so the animation steps land on what the voice is saying."""
    if not narration or not narration.words:
        return "(no narration timing yet: pace the steps evenly)"
    sentences = [s for s in re.split(r"(?<=[.!?;:])\s+", narration.text.strip()) if s]
    words, i, out = narration.words, 0, []
    for s in sentences:
        n = len(s.split())
        if i < len(words):
            out.append(f"- t={words[i].start + offset:.1f}s: {s}")
        i += n
    return "\n".join(out)


def _code_from(reply: str) -> str:
    m = re.search(r"```(?:python)?\s*\n(.*?)```", reply, re.S)
    return (m.group(1) if m else reply).strip() + "\n"


def _audit(path: Path, cls: str) -> tuple[list[str], list[str], bool]:
    """-> (errors, warnings, crashed)"""
    proc = subprocess.run([config.PYTHON, str(config.MOTOR / "auditor" / "auditar.py"), str(path), cls],
                          cwd=config.MOTOR, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", timeout=300)
    errors = re.findall(r"\[ERROR\] (.+)", proc.stdout)
    warnings = re.findall(r"\[AVISO\] (.+)", proc.stdout)
    if proc.returncode != 0 and not errors:
        # The module itself crashed (syntax error, bad helper call...): the traceback is the error
        return [(proc.stderr or proc.stdout).strip()[-1800:]], warnings, True
    return errors, warnings, False


def _render(path: Path, cls: str, media: Path) -> Path:
    subprocess.run([config.PYTHON, "-m", "manim", "render", "--format", "mp4", "--disable_caching",
                    "--media_dir", str(media), "-v", "WARNING", str(path), cls],
                   cwd=path.parent, capture_output=True, text=True, check=True, timeout=900)
    raw = next(media.rglob(f"{cls}.mp4"))
    # Normalize to constant-frame-rate H.264 with regular keyframes: Remotion's
    # frame extractor can't seek reliably in Manim's own encoding.
    clip = media / "clip.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-an", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", "-r", "30", "-g", "30", "-crf", "18", "-movflags", "+faststart",
                    str(clip)], check=True)
    return clip


def _frames(video: Path, duration: float, out: Path) -> list[bytes]:
    shots = []
    for i, frac in enumerate((0.3, 0.6, 0.95)):
        png = out / f"frame{i}.png"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{duration * frac:.2f}",
                        "-i", str(video), "-frames:v", "1", "-vf", "scale=960:-1", str(png)], check=True)
        shots.append(png.read_bytes())
    return shots


class _Look(BaseModel):
    ok: bool
    issues: list[str]


async def animate(lesson: Lesson, scene: Scene, work: Path, on_step) -> tuple[Path, float, list[ManimAttempt]]:
    work.mkdir(parents=True, exist_ok=True)
    narr = scene.assets.narration
    duration = max(8.0, (narr.duration if narr else len(scene.narration.split()) / 2.5) + 0.8)
    cls = "Nemi" + re.sub(r"\W", "", scene.id).capitalize()
    path = work / "scene.py"

    task = f"""Lesson: {lesson.title} — audience: {lesson.audience}. Language: {lesson.language}.
Scene title: {scene.title}

What the animation must show:
{scene.manim_brief}

Narration beats (the voice says this, at these times):
{beats(narr, 0.35)}

Module skeleton (fill in construct):
```python
{_skeleton(lesson, cls, duration)}```"""
    convo = [{"type": "input_text", "text": task}]
    code = _code_from(await meta.think_text(system=_coder_system(), content=convo, effort="medium"))

    attempts: list[ManimAttempt] = []
    best: tuple[int, str] | None = None  # (error count, code) of the best module that runs
    for n in range(1, MAX_AUDITS + 1):
        path.write_text(code, encoding="utf-8")
        errors, warnings, crashed = await asyncio.to_thread(_audit, path, cls)
        attempts.append(ManimAttempt(attempt=n, errors=errors, warnings=warnings))
        if not crashed and (best is None or len(errors) < best[0]):
            best = (len(errors), code)
        await on_step(n, errors, warnings, n == MAX_AUDITS)
        if not errors:
            break
        if n == MAX_AUDITS:
            if best is None:
                raise RuntimeError(f"Manim scene still crashes after {n} attempts")
            # Geometry nits left: a slightly loose connector beats no animation at all
            code = best[1]
            path.write_text(code, encoding="utf-8")
            break
        fix = (f"The nemaxyz auditor rejected your scene.\nERRORS:\n- " + "\n- ".join(errors)
               + ("\nWARNINGS:\n- " + "\n- ".join(warnings[:8]) if warnings else "")
               + f"\n\nYour code:\n```python\n{code}```\nReturn the full corrected module.")
        code = _code_from(await meta.think_text(system=_coder_system(),
                                                content=convo + [{"type": "input_text", "text": fix}]))

    async with _render_slots:
        clip = await asyncio.to_thread(_render, path, cls, work / "media")
        clip_duration = await asyncio.to_thread(probe_duration, clip)

        # Last check with eyes: does the rendered animation look right?
        shots = await asyncio.to_thread(_frames, clip, clip_duration, work)
        look = await meta.think_json(
            _Look, model=config.VISION_MODEL, effort="low",
            system="You check frames of an educational animation. ok=false only for real defects: "
                   "text cut off or overlapping, unreadable text, an empty or broken frame, or content "
                   "that contradicts the brief.",
            content=[{"type": "input_text", "text": f"Brief:\n{scene.manim_brief}"},
                     *[meta.image_part(s) for s in shots]],
        )
        attempts.append(ManimAttempt(attempt=len(attempts) + 1, errors=[] if look.ok else look.issues,
                                     warnings=["vision check passed" if look.ok else "vision check"]))
        await on_step(-1, [] if look.ok else look.issues, [], False)
        if not look.ok:
            fix = ("A reviewer looked at frames of your rendered scene and found:\n- " + "\n- ".join(look.issues)
                   + f"\n\nYour code:\n```python\n{code}```\nReturn the full corrected module.")
            fixed = _code_from(await meta.think_text(system=_coder_system(),
                                                     content=convo + [{"type": "input_text", "text": fix}]))
            path.write_text(fixed, encoding="utf-8")
            errors, warnings, _ = await asyncio.to_thread(_audit, path, cls)
            if not errors:
                clip = await asyncio.to_thread(_render, path, cls, work / "media2")
                clip_duration = await asyncio.to_thread(probe_duration, clip)
            else:
                path.write_text(code, encoding="utf-8")  # keep the version that passed the auditor
    return clip, clip_duration, attempts
