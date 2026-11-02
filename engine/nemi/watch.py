"""Muse Spark watches the finished MP4, picture and sound, like a teacher would before class."""

from pathlib import Path

from . import meta
from .schema import Lesson, VideoReview
from .typography import clean, clean_all

# The docs suggest 1.2 for audio, but in testing 1.3 heard the narration fine, wrote better notes
# and kept Spanish accents that 1.2 dropped in structured output
WATCH_MODEL = "muse-spark-1.3"


def _system(lesson: Lesson) -> str:
    return f"""You are an experienced teacher reviewing an educational video before showing it to your class.
Audience: {lesson.audience}. Language of the video: {lesson.language}.

Watch the whole video and listen to the narration. Judge it as a lesson, not as a film:
- Does what the voice says match what is on screen at that moment?
- Is any text cut off, overlapping, too small or on screen too briefly to read?
- Is anything confusing, wrong or too fast for this audience?
- Do the quiz and the closing question work?

Score it from 1 to 10. List what works, and up to 6 notes, each with the time (m:ss) where it happens,
what the problem is and a concrete fix. Only real problems; if the video is good, say so with few notes.

You also get the exact script: the narration and every line of text shown on screen. Its spelling and accents
are already checked, and small accent marks are hard to see in sampled frames, so never report spelling or
missing accents. Use the script to judge timing and clarity.

Write everything in {lesson.language} with correct spelling, including every accent and special letter
of that language. Avoid em dashes and guillemets."""


def _script(lesson: Lesson) -> str:
    lines = []
    for i, s in enumerate(lesson.scenes, 1):
        shown = [s.title, *s.points, *(s.diagram_parts and [p.label for p in s.diagram_parts] or [])]
        if s.quiz:
            shown += [s.quiz.question, *s.quiz.options, s.quiz.explanation]
        narration = s.assets.narration.text if s.assets.narration else s.narration
        lines.append(f"Scene {i} ({s.kind}). On screen: {' / '.join(x for x in shown if x)}. Voice: {narration}")
    return "\n".join(lines)


async def review(lesson: Lesson, mp4: Path) -> VideoReview:
    file_id = await meta.upload_file(mp4.read_bytes(), mp4.name, "video/mp4")
    try:
        r = await meta.think_json(
            VideoReview,
            system=_system(lesson),
            content=[{"type": "input_text", "text": f"Lesson: {lesson.title}.\n\nScript:\n{_script(lesson)}\n\nReview this video."},
                     {"type": "input_file", "file_id": file_id}],
            model=WATCH_MODEL,
            effort="medium",
        )
    finally:
        await meta.delete_file(file_id)
    # Structured output sometimes drops accents: one proofreading pass over every visible line
    texts = [r.summary, *r.strengths, *[x for n in r.notes for x in (n.issue, n.fix)]]
    fixed = clean_all(await meta.respell(texts, lesson.language))
    r.summary, r.strengths = fixed[0], fixed[1:1 + len(r.strengths)]
    rest = fixed[1 + len(r.strengths):]
    for i, n in enumerate(r.notes):
        n.issue, n.fix = rest[2 * i], rest[2 * i + 1]
    return r
