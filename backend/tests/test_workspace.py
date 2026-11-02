from backend.services.priorities import MAX_ACTIVE_PRIORITIES_PER_WEEK
from backend.weeks import current_week

from .conftest import register


def test_challenge_crud_and_isolation(client, new_client):
    register(client)
    created = client.post("/api/challenges", json={"title": "課題A", "importance": "Medium"}).json()
    assert created["status"] == "Open"

    updated = client.put(f"/api/challenges/{created['id']}", json={"status": "Resolved", "title": None, "id": "ignored"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "Resolved"
    assert updated.json()["title"] == "課題A"

    other = new_client()
    register(other, email="b@example.com")
    assert other.get("/api/challenges").json() == []
    assert other.put(f"/api/challenges/{created['id']}", json={"title": "hack"}).status_code == 404
    assert other.delete(f"/api/challenges/{created['id']}").status_code == 404

    assert client.delete(f"/api/challenges/{created['id']}").status_code == 200
    assert client.get("/api/challenges").json() == []


def test_invalid_values_rejected(client):
    register(client)
    assert client.post("/api/challenges", json={"title": "x", "status": "Bogus"}).status_code == 400
    assert client.put("/api/challenges/not-a-uuid", json={}).status_code == 400


def test_priority_limit_and_challenge_link(client, new_client):
    register(client)
    challenge = client.post("/api/challenges", json={"title": "課題"}).json()

    first = client.post("/api/priorities", json={"title": "P0", "challenge_id": challenge["id"]}).json()
    assert first["challenge_title"] == "課題"
    assert first["target_week"] == current_week()

    for i in range(1, MAX_ACTIVE_PRIORITIES_PER_WEEK):
        assert client.post("/api/priorities", json={"title": f"P{i}"}).status_code == 201
    assert client.post("/api/priorities", json={"title": "over"}).status_code == 400

    # completing one frees a slot; reopening it while full is rejected
    client.put(f"/api/priorities/{first['id']}", json={"status": "Completed"})
    assert client.post("/api/priorities", json={"title": "fills slot"}).status_code == 201
    assert client.put(f"/api/priorities/{first['id']}", json={"status": "In Progress"}).status_code == 400

    # unlink challenge with explicit null
    unlinked = client.put(f"/api/priorities/{first['id']}", json={"challenge_id": None}).json()
    assert unlinked["challenge_id"] is None and unlinked["challenge_title"] is None

    # cannot link another user's challenge
    other = new_client()
    register(other, email="b@example.com")
    res = other.post("/api/priorities", json={"title": "x", "challenge_id": challenge["id"]})
    assert res.status_code == 400


def test_stakeholders_with_expectations(client):
    register(client)
    st = client.post("/api/stakeholders", json={"name": "家族", "relationship": "Family"}).json()
    assert st["interests"] == []
    exp = client.post(f"/api/stakeholders/{st['id']}/interests", json={"title": "週末オフ"}).json()
    assert exp["stakeholder_name"] == "家族"

    listed = client.get("/api/stakeholders").json()
    assert listed[0]["interests"][0]["id"] == exp["id"]

    assert client.put(f"/api/stakeholder-interests/{exp['id']}", json={"status": "Addressed"}).json()["status"] == "Addressed"
    assert client.delete(f"/api/stakeholder-interests/{exp['id']}").status_code == 200
    assert client.delete(f"/api/stakeholders/{st['id']}").status_code == 200


def test_memo_convert_and_auto_stock(client):
    register(client)
    memo = client.post("/api/memos", json={"content": "  会議メモ\n詳細  ", "tags": []}).json()
    assert memo["content"] == "会議メモ\n詳細"

    res = client.post(f"/api/memos/{memo['id']}/convert", json={"targetType": "interest", "title": "関心"})
    assert res.json()["createdEntity"]["title"] == "関心"
    assert client.get("/api/memos").json()[0]["converted_to"] == "interest"

    client.post("/api/memos", json={"content": "課題メモ", "tags": ["Problems"]})
    client.post("/api/memos", json={"content": "優先メモ", "tags": ["優先事項"]})
    client.post("/api/memos", json={"content": "関心メモ", "tags": ["興味関心"]})
    stocked = client.post("/api/memos/auto-stock", json={}).json()
    # the already-converted memo is cleared without being stocked twice
    assert stocked["stockedCounts"] == {"priority": 1, "challenge": 1, "interest": 1}
    assert len(client.get("/api/interests").json()) == 2
    assert client.get("/api/memos").json() == []


def test_auto_stock_respects_priority_limit(client):
    register(client)
    for i in range(MAX_ACTIVE_PRIORITIES_PER_WEEK):
        client.post("/api/priorities", json={"title": f"P{i}"})
    client.post("/api/memos", json={"content": "もう一件", "tags": ["優先事項"]})
    stocked = client.post("/api/memos/auto-stock").json()
    assert stocked["processedCount"] == 0 and stocked["skippedCount"] == 1
    assert len(client.get("/api/memos").json()) == 1


def test_reviews_decisions_dashboard_export(client):
    register(client)
    p = client.post("/api/priorities", json={"title": "P"}).json()
    review = client.post(
        "/api/reviews",
        json={"summary": "良い週", "next_week_actions": ["a"], "answers": {"accomplished": "x"}},
    ).json()
    assert review["week_start"] and review["answers"] == {"accomplished": "x"}
    assert client.get("/api/reviews/latest").json()["id"] == review["id"]

    log = client.post("/api/decision-logs", json={"priority_id": p["id"], "decision": "d", "reason": "r"}).json()
    assert client.get("/api/decision-logs").json()[0]["id"] == log["id"]

    overview = client.get("/api/dashboard/overview").json()
    assert overview["metrics"]["activePrioritiesCount"] == 1
    assert overview["latestReview"]["id"] == review["id"]
    assert isinstance(overview["aiInsights"], list)

    assert len(client.post("/api/insights/analyze", json={"userQuery": "?"}).json()["insights"]) >= 0

    export = client.get("/api/system/export")
    assert "attachment" in export.headers["content-disposition"]
    assert export.json()["data"]["priorities"][0]["id"] == p["id"]
