"""Timing that keeps voice, captions and animation in step."""

from nemi.manim_agent import _code_from, beats
from nemi.media import _overlap, image_size_for
from nemi.schema import Narration, Word
from nemi.voice import _spread_words


def test_teacher_words_stay_inside_their_turn():
    turns = [{"transcript": "Hola chicos.", "startMs": 500, "endMs": 1500},
             {"transcript": "Hoy vemos volcanes", "startMs": 2000, "endMs": 4000}]
    words, text = _spread_words(turns, total=5)
    assert [w.text for w in words] == ["Hola", "chicos", "Hoy", "vemos", "volcanes"]
    assert text == "Hola chicos. Hoy vemos volcanes"
    assert words[0].start == 0.5 and words[1].end == 1.5
    assert all(2.0 <= w.start < w.end <= 4.0 for w in words[2:])
    assert all(a.end <= b.start + 1e-6 for a, b in zip(words, words[1:]))


def test_manim_beats_follow_each_sentence():
    words = [Word(text=t, start=s, end=s + 0.3) for t, s in
             [("El", 0.0), ("magma", 0.4), ("sube.", 0.8), ("Luego", 2.0), ("sale.", 2.5)]]
    narr = Narration(audio="", duration=3, words=words, voice="v", text="El magma sube. Luego sale.")
    out = beats(narr, offset=0.35).splitlines()
    assert out == ["- t=0.3s: El magma sube.", "- t=2.4s: Luego sale."]


def test_code_is_extracted_from_the_reply():
    reply = "Here it is:\n```python\nprint('hola')\n```\nDone."
    assert _code_from(reply) == "print('hola')\n"


def test_box_overlap_and_image_sizes():
    assert _overlap((0, 0, 10, 10), (0, 0, 10, 10)) == 1
    assert _overlap((0, 0, 10, 10), (20, 20, 30, 30)) == 0
    assert image_size_for("hook", "landscape") == "1792x1024"
    assert image_size_for("diagram", "portrait") == "1024x1024"


def test_overlapping_turns_do_not_repeat_words():
    # What Muse Voice Transcribe returned in the cloud: each turn repeats the edge of the previous one
    turns = [{"transcript": "Chicos", "startMs": 0, "endMs": 600},
             {"transcript": "Chicos, miren el lago Titicaca. Eso se llama", "startMs": 0, "endMs": 6000},
             {"transcript": "llama evaporación. Forma las nubes.", "startMs": 5500, "endMs": 9000},
             {"transcript": "las nubes.", "startMs": 8500, "endMs": 9200}]
    words, text = _spread_words(turns, total=10)
    assert text == "Chicos, miren el lago Titicaca. Eso se llama evaporación. Forma las nubes."
    assert [w.text for w in words].count("llama") == 1
    assert all(a.start <= b.start for a, b in zip(words, words[1:]))


def test_stutters_inside_a_turn_are_collapsed():
    turns = [{"transcript": "Chicos,Chicos miren al cielo. cielo. El El sol calienta", "startMs": 0, "endMs": 5000}]
    words, text = _spread_words(turns, total=6)
    assert text == "Chicos, miren al cielo. El sol calienta"
    assert [w.text for w in words] == ["Chicos", "miren", "al", "cielo", "El", "sol", "calienta"]
