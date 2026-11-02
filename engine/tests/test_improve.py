"""improve.scene_ranges must time scenes like packages/video/src/timing.ts, or a note's minute lands on the wrong scene."""

import math
import re
from pathlib import Path

from nemi import improve
from nemi.schema import Lesson, Narration, QuizSpec, Scene, SceneAssets

TIMING_TS = Path(__file__).resolve().parents[2] / "packages" / "video" / "src" / "timing.ts"


def scene(id, kind, voice=None, reveal=None, clip=None, narration="Hola.", explanation="Porque si."):
    quiz = QuizSpec(question="?", options=["a", "b"], answer_index=0, explanation=explanation) if kind == "quiz" else None
    assets = SceneAssets(narration=Narration(audio="", duration=voice, voice="v") if voice is not None else None,
                         reveal=Narration(audio="", duration=reveal, voice="v") if reveal is not None else None,
                         clip_duration=clip)
    return Scene(id=id, kind=kind, act="key", title="T", narration=narration, points=[], image_prompt=None,
                 latex=[], quiz=quiz, diagram_parts=[], manim_brief=None, assets=assets)


def test_constants_match_the_video_timing():
    ts = TIMING_TS.read_text(encoding="utf-8")
    consts = {k: float(v) for k, v in re.findall(r"export const (FPS|LEAD|TAIL|THINK) = ([\d.]+);", ts)}
    assert consts == {"FPS": improve.FPS, "LEAD": improve.LEAD, "TAIL": improve.TAIL, "THINK": improve.THINK}
    block = re.search(r"MIN_SECONDS[^{]*\{([^}]*)\}", ts).group(1)
    assert {k: float(v) for k, v in re.findall(r"(\w+): ([\d.]+)", block)} == improve.MIN_SECONDS
    # The rules scene_ranges copies: the word-count guess and the quiz's pause before and beat after the reveal
    assert "Math.max(1.5, text.trim().split(/\\s+/).length / 2.6)" in ts
    assert "thinkStart = LEAD + voice + 0.3;" in ts
    assert "total = revealStart + reveal + 1.2;" in ts


def test_scene_ranges_are_contiguous_whole_frames_from_zero():
    lesson = Lesson(scenes=[
        scene("a", "hook", voice=3.31),                  # 0.35 + 3.31 + 0.65 = 4.31 s
        scene("b", "diagram", voice=1.0),                # 2 s, raised to the 6 s minimum
        scene("c", "quiz", voice=2.0, reveal=3.0),       # 0.35 + 2 + 0.3 + 8 + 3 + 1.2 = 14.85 s
        scene("d", "quiz", voice=2.0, explanation=" ".join(["uno"] * 13)),  # reveal guessed: 13 / 2.6 = 5 s
        scene("e", "manim", voice=2.0, clip=9.95),       # the clip is longer than the voice: 10.15 s
        scene("f", "concept", narration=" ".join(["palabra"] * 20)),  # no audio yet: 20 / 2.6 s of voice
    ])
    ranges = improve.scene_ranges(lesson)

    assert [s.id for s, _, _ in ranges] == ["a", "b", "c", "d", "e", "f"]
    assert ranges[0][1] == 0
    assert all(end == start for (_, _, end), (_, start, _) in zip(ranges, ranges[1:]))
    frames = [round((b - a) * improve.FPS, 6) for _, a, b in ranges]
    # each scene is rounded up to a whole frame, as Math.ceil(total * FPS) does in timing.ts
    assert frames == [130, 180, 446, 506, 305, 261]
    assert math.isclose(ranges[-1][2], sum(frames) / improve.FPS)
