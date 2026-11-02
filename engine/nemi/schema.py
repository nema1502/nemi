"""The lesson contract shared by the engine, the Remotion compositions and the web app.

`packages/video/src/types.ts` mirrors these models; keep both in sync.

Two layers:
- `*Spec` models are what Muse Spark writes (sent as the structured-output schema).
- `Scene` / `Lesson` add what the pipeline produces: audio, images, masks, clips.
"""

from __future__ import annotations

import time
import uuid
from typing import Literal

from pydantic import BaseModel, Field

SceneKind = Literal["hook", "concept", "image", "diagram", "formula", "manim", "quiz", "summary"]
# The five acts of the nemaxyz narrative (motor/NARRATIVA_STORYTELLING.md)
Act = Literal["anchor", "crack", "key", "proof", "thread"]
Format = Literal["landscape", "portrait"]


# ---------------------------------------------------------------- what the model writes

class QuizSpec(BaseModel):
    question: str
    options: list[str]
    answer_index: int
    explanation: str


class DiagramPartSpec(BaseModel):
    label: str = Field(description="Label shown on screen, in the lesson language")
    sam_prompt: str = Field(description="Short English noun phrase SAM 3.1 can find in the image")
    note: str = Field(description="One short line shown next to the label")


class SceneSpec(BaseModel):
    kind: SceneKind
    act: Act
    title: str
    narration: str
    points: list[str] = Field(description="Short on-screen lines (concept/summary/image), max 4")
    image_prompt: str | None = Field(description="hook/image/diagram: what to draw, no text in the image")
    latex: list[str] = Field(description="formula: LaTeX steps shown one after another")
    quiz: QuizSpec | None
    diagram_parts: list[DiagramPartSpec] = Field(description="diagram: 2-5 parts to highlight")
    manim_brief: str | None = Field(description="manim: what the animation must show, step by step")


class LessonPlanSpec(BaseModel):
    title: str
    subtitle: str
    objectives: list[str]
    key_terms: list[str]
    art_direction: str = Field(description="One visual style applied to every illustration")
    scenes: list[SceneSpec]


class CheckSpec(BaseModel):
    question: str
    verdict: Literal["yes", "no", "doubtful"]
    reason: str
    fix: str


class ReviewSpec(BaseModel):
    checks: list[CheckSpec]
    fact_issues: list[str]


# ---------------------------------------------------------------- what the pipeline adds

class Word(BaseModel):
    text: str
    start: float  # seconds from the start of the audio clip
    end: float


class Narration(BaseModel):
    audio: str  # path relative to the engine's /files mount
    duration: float
    words: list[Word] = []
    voice: str
    source: Literal["tts", "teacher"] = "tts"
    text: str = ""  # what was spoken; lets the UI tell when narration is stale


class Region(BaseModel):
    """One SAM 3.1 mask, ready to draw as an SVG path over the illustration."""
    label: str
    note: str
    found: bool
    path: str = ""                    # SVG path in mask-local raster pixels
    mask_size: tuple[int, int] = (0, 0)
    box: tuple[float, float, float, float] = (0, 0, 0, 0)  # left, top, right, bottom in image px
    confidence: float | None = None


class ManimAttempt(BaseModel):
    attempt: int
    errors: list[str]
    warnings: list[str]


class SceneAssets(BaseModel):
    image: str | None = None
    image_size: tuple[int, int] | None = None
    narration: Narration | None = None
    reveal: Narration | None = None   # quiz: the explanation after the answer
    regions: list[Region] = []
    clip: str | None = None
    clip_duration: float | None = None
    manim_attempts: list[ManimAttempt] = []


class Scene(SceneSpec):
    id: str
    assets: SceneAssets = SceneAssets()


class Theme(BaseModel):
    name: str
    bg: str
    surface: str
    ink: str
    muted: str
    accent: str
    accent2: str
    accent3: str
    good: str
    bad: str


THEMES: dict[str, Theme] = {
    "night": Theme(name="night", bg="#0C0A1A", surface="#17142B", ink="#F5F7FF", muted="#9AA3B8",
                   accent="#A78BFA", accent2="#5EE7DF", accent3="#FFC94D", good="#3DDC84", bad="#FF5C5C"),
    "chalk": Theme(name="chalk", bg="#14261E", surface="#1C3329", ink="#F3F1E7", muted="#A9B8AE",
                   accent="#FFD166", accent2="#7FD1FF", accent3="#FF9AA2", good="#9BE564", bad="#FF6B6B"),
    "paper": Theme(name="paper", bg="#FBF7EF", surface="#FFFFFF", ink="#1E1B2E", muted="#6B6880",
                   accent="#5B4BDB", accent2="#0FA3A3", accent3="#E07A1F", good="#1F9D55", bad="#D64545"),
}


class VideoNote(BaseModel):
    time: str = Field(description="m:ss in the video")
    issue: str
    fix: str
    severity: Literal["minor", "major"]


class VideoReview(BaseModel):
    score: int = Field(description="1 to 10")
    summary: str
    strengths: list[str]
    notes: list[VideoNote]


class Event(BaseModel):
    t: float
    step: str
    message: str
    level: Literal["info", "ok", "warn", "error"] = "info"


Status = Literal["queued", "reading", "planning", "reviewing", "producing", "ready", "rendering", "error"]


class Lesson(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:10])
    created_at: float = Field(default_factory=time.time)
    status: Status = "queued"
    # request
    topic: str = ""
    source_name: str | None = None
    audience: str = ""
    language: str = "es"
    format: Format = "landscape"
    voice: str = "es-BO-MarceloNeural"
    theme: Theme = THEMES["night"]
    # plan
    title: str = ""
    subtitle: str = ""
    objectives: list[str] = []
    key_terms: list[str] = []
    art_direction: str = ""
    scenes: list[Scene] = []
    review: ReviewSpec | None = None
    # outputs
    events: list[Event] = []
    video: str | None = None
    video_review: VideoReview | None = None
    render_progress: float | None = None
    error: str | None = None


def new_scene_id(i: int) -> str:
    return f"s{i + 1}-{uuid.uuid4().hex[:4]}"
