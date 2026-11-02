from datetime import date

from backend.security import hash_password, verify_password
from backend.services.insights import AnalysisInput, generate_insights
from backend.services.memos import classify
from backend.weeks import week_bounds, week_string


def test_iso_week():
    assert week_string(date(2026, 1, 1)) == "2026-W01"
    assert week_string(date(2027, 1, 1)) == "2026-W53"
    assert week_bounds(date(2026, 11, 4)) == (date(2026, 11, 2), date(2026, 11, 8))


def test_classify_memo_tags():
    assert classify(["優先事項"]) == "priority"
    assert classify(["Problems"]) == "challenge"
    assert classify(["興味関心"]) == "interest"
    assert classify([]) == "priority"


def test_password_hashing():
    h = hash_password("correct horse")
    assert h.startswith("$argon2id$")
    assert verify_password(h, "correct horse")
    assert not verify_password(h, "wrong")
    assert not verify_password(None, "anything")


def test_heuristic_insights():
    insights = generate_insights(
        AnalysisInput(
            challenges=[{"id": 1, "title": "C", "status": "Open", "importance": "High"}],
            priorities=[],
            interests=[{"title": "I", "status": "Interested"}],
            stakeholders=[{"name": "家族", "relationship": "Family", "interests": []}],
            reviews=[],
        ),
        use_ai=True,  # no GEMINI_API_KEY in tests -> falls back to rules
    )
    assert {i["type"] for i in insights} == {"priority_mismatch", "neglected_interest", "stakeholder_alignment"}
