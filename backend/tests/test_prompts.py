"""The citizen prompt states the answer language explicitly."""
from app.llm.prompts.citizen import build_citizen_system


def test_answer_language_is_stated():
    assert "ANSWER LANGUAGE: English" in build_citizen_system("ctx", language="en")
    assert "ANSWER LANGUAGE: Serbian" in build_citizen_system("ctx", language="sr")


def test_unknown_language_adds_nothing():
    assert "ANSWER LANGUAGE" not in build_citizen_system("ctx", language="de")
    assert "ANSWER LANGUAGE" not in build_citizen_system("ctx")
