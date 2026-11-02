from nemi.typography import clean, clean_all

EM, EN, DOT, ARROW = chr(0x2014), chr(0x2013), chr(0xB7), chr(0x2192)
LQ, RQ = chr(0xAB), chr(0xBB)


def test_em_dash_becomes_a_comma():
    assert clean(f"La lava {EM} roca derretida {EM} sale.") == "La lava, roca derretida, sale."


def test_en_dash_in_ranges_becomes_a_hyphen():
    assert clean(f"Edades 10{EN}11") == "Edades 10-11"


def test_middle_dot_and_arrow():
    assert clean(f"Nemi {DOT} Beta") == "Nemi, Beta"
    assert clean(f"Magma {ARROW} lava") == "Magma, lava"


def test_guillemets_become_straight_quotes():
    assert clean(f"Dijo {LQ}hola{RQ}") == 'Dijo "hola"'


def test_no_comma_after_closing_punctuation():
    assert clean(f"¿Qué pasa? {EM} preguntó") == "¿Qué pasa? preguntó"


def test_plain_text_is_untouched():
    text = "Sube por la chimenea, como una pajilla."
    assert clean(text) == text
    assert clean(None) is None
    assert clean_all(["a", f"b {EM} c"]) == ["a", "b, c"]
