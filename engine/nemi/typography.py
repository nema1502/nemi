"""Plain punctuation for everything students and teachers see.

Models love em dashes, guillemets, middle dots and arrows; on a lesson slide
they look machine-made. The planner is told not to use them, and this pass
catches whatever slips through. Characters are written as escapes so the
source itself stays plain."""

import re

EM_DASH = "\\u2014\\u2015"
EN_DASH = "\\u2013"
MIDDLE_DOT = "\\u00b7"
ARROWS = "\\u2192\\u27f6"
DOUBLE_QUOTES = "\\u00ab\\u00bb\\u201c\\u201d\\u201e"
SINGLE_QUOTES = "\\u2018\\u2019\\u201a"

_RULES = [
    (re.compile(rf"\s*[{EM_DASH}]\s*"), ", "),              # a comma reads the same out loud
    (re.compile(rf"(?<=\d)\s*{EN_DASH}\s*(?=\d)"), "-"),     # ranges: 10-11
    (re.compile(rf"\s*{EN_DASH}\s*"), ", "),
    (re.compile(rf"\s*{MIDDLE_DOT}\s*"), ", "),
    (re.compile(rf"\s*([{ARROWS}]|=>)\s*"), ", "),
    (re.compile(rf"[{DOUBLE_QUOTES}]"), '"'),
    (re.compile(rf"[{SINGLE_QUOTES}]"), "'"),
    (re.compile(r" {2,}"), " "),
    (re.compile(r",\s*([.,;:!?])"), r"\1"),
    (re.compile(r"([.;:!?]),"), r"\1"),
    (re.compile(r"^\s*,\s*|\s*,\s*$"), ""),
]


def clean(text: str | None) -> str | None:
    if not text:
        return text
    for pattern, repl in _RULES:
        text = pattern.sub(repl, text)
    return text.strip()


def clean_all(items: list[str]) -> list[str]:
    return [clean(x) for x in items]
