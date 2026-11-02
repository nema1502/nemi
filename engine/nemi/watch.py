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
Write everything in {lesson.language} with correct spelling, including every accent and special letter
of that language. Avoid em dashes and guillemets."""


async def review(lesson: Lesson, mp4: Path) -> VideoReview:
    file_id = await meta.upload_file(mp4.read_bytes(), mp4.name, "video/mp4")
    try:
        r = await meta.think_json(
            VideoReview,
            system=_system(lesson),
            content=[{"type": "input_text", "text": f"Lesson: {lesson.title}. Review this video."},
                     {"type": "input_file", "file_id": file_id}],
            model=WATCH_MODEL,
            effort="medium",
        )
    finally:
        await meta.delete_file(file_id)
    r.summary = clean(r.summary)
    r.strengths = clean_all(r.strengths)
    for n in r.notes:
        n.issue, n.fix = clean(n.issue), clean(n.fix)
    return r
