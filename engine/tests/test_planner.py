from nemi.planner import needs_revision, tidy
from nemi.schema import CheckSpec, DiagramPartSpec, LessonPlanSpec, QuizSpec, ReviewSpec, SceneSpec


def scene(kind, **kw):
    base = dict(kind=kind, act="key", title="T", narration="Hola.", points=[], image_prompt=None, latex=[],
                quiz=None, diagram_parts=[], manim_brief=None)
    return SceneSpec(**(base | kw))


def plan(*scenes):
    return LessonPlanSpec(title="L", subtitle="S", objectives=[], key_terms=[], art_direction="flat", scenes=list(scenes))


def test_quiz_answer_index_is_clamped_to_the_options():
    p = tidy(plan(scene("quiz", quiz=QuizSpec(question="?", options=["a", "b", "c"], answer_index=7, explanation="e"))))
    assert p.scenes[0].quiz.answer_index == 2


def test_impossible_scenes_fall_back_to_something_renderable():
    p = tidy(plan(
        scene("image", image_prompt=None),                      # no picture to draw
        scene("diagram", image_prompt="volcano", diagram_parts=[DiagramPartSpec(label="a", sam_prompt="a", note="")]),
        scene("formula", latex=[]),
        scene("quiz", quiz=None),
    ))
    assert [s.kind for s in p.scenes] == ["concept", "image", "concept", "concept"]


def test_at_most_two_manim_scenes():
    p = tidy(plan(*[scene("manim", manim_brief="draw a fraction") for _ in range(4)]))
    assert [s.kind for s in p.scenes] == ["manim", "manim", "concept", "concept"]


def test_on_screen_lines_are_capped_and_cleaned():
    p = tidy(plan(scene("concept", points=["uno", "", f"dos {chr(0x2014)} tres", "cuatro", "cinco", "seis"])))
    assert p.scenes[0].points == ["uno", "dos, tres", "cuatro", "cinco"]


def test_revision_is_needed_for_any_doubt_or_fact_issue():
    ok = CheckSpec(question="q", verdict="yes", reason="", fix="")
    doubt = CheckSpec(question="q", verdict="doubtful", reason="", fix="")
    assert not needs_revision(ReviewSpec(checks=[ok], fact_issues=[]))
    assert needs_revision(ReviewSpec(checks=[ok, doubt], fact_issues=[]))
    assert needs_revision(ReviewSpec(checks=[ok], fact_issues=["lava is not a part"]))
