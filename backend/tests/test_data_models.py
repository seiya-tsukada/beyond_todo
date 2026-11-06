"""Every insert / update API: happy path, persistence, validation, user isolation,
and the database constraints that back up the application checks."""

import threading

import psycopg
import pytest

from backend.services.priorities import MAX_ACTIVE_PRIORITIES_PER_WEEK
from backend.weeks import current_week

from .conftest import register


def _sql(db, query, params=None):
    with psycopg.connect(db, autocommit=True) as conn:
        cur = conn.execute(query, params)
        return cur.fetchall() if cur.description else cur.rowcount


def _seed(client):
    """Create one row of every kind through the API and return them."""
    challenge = client.post("/api/challenges", json={"title": "課題", "description": "d", "importance": "Low"})
    assert challenge.status_code == 201, challenge.text
    challenge = challenge.json()
    priority = client.post(
        "/api/priorities", json={"title": "優先", "reason": "r", "challenge_id": challenge["id"]}
    ).json()
    interest = client.post("/api/interests", json={"title": "関心", "category": "Tech", "who": "チーム"}).json()
    stakeholder = client.post("/api/stakeholders", json={"name": "顧客", "relationship": "Customer"}).json()
    expectation = client.post(f"/api/stakeholders/{stakeholder['id']}/interests", json={"title": "期待"}).json()
    review = client.post("/api/reviews", json={"summary": "週", "completed_priorities": ["優先"]}).json()
    log = client.post("/api/decision-logs", json={"priority_id": priority["id"], "decision": "d", "reason": "r"}).json()
    memo = client.post("/api/memos", json={"content": "メモ", "tags": ["a"]}).json()
    return {
        "challenge": challenge,
        "priority": priority,
        "interest": interest,
        "stakeholder": stakeholder,
        "expectation": expectation,
        "review": review,
        "log": log,
        "memo": memo,
    }


# ---------------------------------------------------------------------------
# Insert / update APIs persist and return the documented shape
# ---------------------------------------------------------------------------
def test_inserts_persist_and_match_response_models(client, new_client):
    user = register(client)
    rows = _seed(client)

    for row in rows.values():
        assert row["user_id"] == user["id"]
        assert row["created_at"] and row["updated_at"]

    assert rows["priority"]["target_week"] == current_week()
    assert rows["priority"]["challenge_title"] == "課題"
    assert rows["interest"]["status"] == "Interested"
    assert rows["stakeholder"]["interests"] == []
    assert rows["expectation"]["stakeholder_name"] == "顧客"
    assert rows["review"]["week_start"] <= rows["review"]["week_end"]
    assert rows["log"]["outcome"] == ""
    assert rows["memo"]["tags"] == ["a"] and rows["memo"]["converted_to"] is None

    # A fresh client (new login, i.e. a page reload) reads the same data back
    again = new_client()
    again.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert [c["id"] for c in again.get("/api/challenges").json()] == [rows["challenge"]["id"]]
    assert [p["id"] for p in again.get("/api/priorities").json()] == [rows["priority"]["id"]]
    assert [i["id"] for i in again.get("/api/interests").json()] == [rows["interest"]["id"]]
    stakeholders = again.get("/api/stakeholders").json()
    assert stakeholders[0]["interests"][0]["id"] == rows["expectation"]["id"]
    assert again.get("/api/reviews/latest").json()["id"] == rows["review"]["id"]
    assert again.get("/api/decision-logs").json()[0]["priority_id"] == rows["priority"]["id"]
    assert again.get("/api/memos").json()[0]["id"] == rows["memo"]["id"]


def test_updates_persist(client):
    register(client)
    rows = _seed(client)
    updates = [
        (f"/api/challenges/{rows['challenge']['id']}", {"status": "In Progress"}, "/api/challenges"),
        (f"/api/priorities/{rows['priority']['id']}", {"status": "Completed"}, "/api/priorities"),
        (f"/api/interests/{rows['interest']['id']}", {"status": "Acting"}, "/api/interests"),
        (f"/api/stakeholders/{rows['stakeholder']['id']}", {"description": "更新"}, "/api/stakeholders"),
        (f"/api/memos/{rows['memo']['id']}", {"content": "更新メモ"}, "/api/memos"),
    ]
    for path, body, list_path in updates:
        res = client.put(path, json=body)
        assert res.status_code == 200, (path, res.text)
        key, value = next(iter(body.items()))
        assert res.json()[key] == value
        assert res.json()["updated_at"] > res.json()["created_at"]
        assert client.get(list_path).json()[0][key] == value

    res = client.put(f"/api/stakeholder-interests/{rows['expectation']['id']}", json={"importance": "Low"})
    assert res.json()["importance"] == "Low"
    assert client.get("/api/stakeholders").json()[0]["interests"][0]["importance"] == "Low"


@pytest.mark.parametrize(
    "path, body",
    [
        ("/api/challenges", {"title": ""}),
        ("/api/challenges", {"title": "x" * 201}),
        ("/api/challenges", {"title": "x", "importance": "Urgent"}),
        ("/api/priorities", {"title": ""}),
        ("/api/priorities", {"title": "x", "target_week": "2026-45"}),
        ("/api/priorities", {"title": "x", "status": "Done"}),
        ("/api/priorities", {"title": "x", "challenge_id": "not-a-uuid"}),
        ("/api/interests", {"title": "x", "status": "Bored"}),
        ("/api/interests", {}),
        ("/api/stakeholders", {"name": ""}),
        ("/api/stakeholders", {"name": "x", "relationship": "Enemy"}),
        ("/api/reviews", {"summary": ""}),
        ("/api/reviews", {"summary": "x", "week_start": "yesterday"}),
        ("/api/reviews", {"summary": "x", "next_week_actions": "not a list"}),
        ("/api/decision-logs", {"decision": "d"}),
        ("/api/decision-logs", {"decision": "", "reason": "r"}),
        ("/api/memos", {"content": ""}),
        ("/api/memos", {"content": "x" * 5001}),
    ],
)
def test_create_validation_errors(client, path, body):
    register(client)
    res = client.post(path, json=body)
    assert res.status_code == 400, res.text
    assert res.json()["error"]


def test_update_and_nested_validation_errors(client):
    register(client)
    rows = _seed(client)
    bad = [
        (f"/api/challenges/{rows['challenge']['id']}", {"status": "Closed"}),
        (f"/api/priorities/{rows['priority']['id']}", {"target_week": "W45"}),
        (f"/api/interests/{rows['interest']['id']}", {"title": ""}),
        (f"/api/stakeholders/{rows['stakeholder']['id']}", {"relationship": "Boss"}),
        (f"/api/stakeholder-interests/{rows['expectation']['id']}", {"status": "Done"}),
        (f"/api/memos/{rows['memo']['id']}", {"content": ""}),
    ]
    for path, body in bad:
        assert client.put(path, json=body).status_code == 400, path
    assert client.post(f"/api/stakeholders/{rows['stakeholder']['id']}/interests", json={"title": ""}).status_code == 400
    assert client.post(f"/api/memos/{rows['memo']['id']}/convert", json={"targetType": "task"}).status_code == 400
    # Converting to an expectation needs a stakeholder
    assert client.post(f"/api/memos/{rows['memo']['id']}/convert", json={"targetType": "stakeholder"}).status_code == 400


# ---------------------------------------------------------------------------
# Isolation: another user can neither read nor write
# ---------------------------------------------------------------------------
def test_other_user_cannot_read_or_write(client, new_client):
    register(client)
    rows = _seed(client)
    other = new_client()
    register(other, email="b@example.com")

    for path in ("/api/challenges", "/api/priorities", "/api/interests", "/api/stakeholders",
                 "/api/reviews", "/api/decision-logs", "/api/memos"):
        assert other.get(path).json() == [], path
    assert other.get("/api/reviews/latest").json() is None
    overview = other.get("/api/dashboard/overview").json()
    assert overview["challenges"] == overview["priorities"] == overview["stakeholders"] == []
    assert all(v == [] for v in other.get("/api/system/export").json()["data"].values())

    writes = [
        ("put", f"/api/challenges/{rows['challenge']['id']}", {"title": "x"}),
        ("put", f"/api/priorities/{rows['priority']['id']}", {"title": "x"}),
        ("put", f"/api/interests/{rows['interest']['id']}", {"title": "x"}),
        ("put", f"/api/stakeholders/{rows['stakeholder']['id']}", {"name": "x"}),
        ("put", f"/api/stakeholder-interests/{rows['expectation']['id']}", {"title": "x"}),
        ("put", f"/api/memos/{rows['memo']['id']}", {"content": "x"}),
        ("post", f"/api/stakeholders/{rows['stakeholder']['id']}/interests", {"title": "x"}),
        ("post", f"/api/memos/{rows['memo']['id']}/convert", {"targetType": "challenge"}),
        ("delete", f"/api/challenges/{rows['challenge']['id']}", None),
        ("delete", f"/api/priorities/{rows['priority']['id']}", None),
        ("delete", f"/api/interests/{rows['interest']['id']}", None),
        ("delete", f"/api/stakeholders/{rows['stakeholder']['id']}", None),
        ("delete", f"/api/stakeholder-interests/{rows['expectation']['id']}", None),
        ("delete", f"/api/decision-logs/{rows['log']['id']}", None),
        ("delete", f"/api/memos/{rows['memo']['id']}", None),
    ]
    for method, path, body in writes:
        res = getattr(other, method)(path, json=body) if body is not None else getattr(other, method)(path)
        assert res.status_code == 404, (method, path, res.status_code)

    # Linking to another user's rows
    assert other.post("/api/priorities", json={"title": "x", "challenge_id": rows["challenge"]["id"]}).status_code == 400
    assert other.post(
        "/api/decision-logs", json={"priority_id": rows["priority"]["id"], "decision": "d", "reason": "r"}
    ).status_code == 404
    mine = other.post("/api/priorities", json={"title": "mine"}).json()
    assert other.put(f"/api/priorities/{mine['id']}", json={"challenge_id": rows["challenge"]["id"]}).status_code == 400
    other_memo = other.post("/api/memos", json={"content": "m"}).json()
    res = other.post(
        f"/api/memos/{other_memo['id']}/convert",
        json={"targetType": "stakeholder", "stakeholder_id": rows["stakeholder"]["id"]},
    )
    assert res.status_code == 400
    # Auto-stock with someone else's memo ids touches nothing
    assert other.post("/api/memos/auto-stock", json={"memo_ids": [rows["memo"]["id"]]}).json()["processedCount"] == 0

    # The owner's data is untouched
    assert client.get("/api/challenges").json()[0]["title"] == "課題"
    assert len(client.get("/api/memos").json()) == 1


# ---------------------------------------------------------------------------
# Database constraints (backstops for the application checks)
# ---------------------------------------------------------------------------
def _user_ids(db):
    return [r[0] for r in _sql(db, "select id from beyond_todo.users order by created_at")]


def test_db_rejects_cross_user_references(client, new_client, db):
    register(client)
    rows = _seed(client)
    register(new_client(), email="b@example.com")
    _, other_id = _user_ids(db)

    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        _sql(db, "insert into beyond_todo.priorities (user_id, challenge_id, title, target_week) values (%s, %s, 'x', %s)",
             (other_id, rows["challenge"]["id"], current_week()))
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        _sql(db, "insert into beyond_todo.stakeholder_interests (user_id, stakeholder_id, title) values (%s, %s, 'x')",
             (other_id, rows["stakeholder"]["id"]))
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        _sql(db, "insert into beyond_todo.decision_logs (user_id, priority_id, decision, reason) values (%s, %s, 'd', 'r')",
             (other_id, rows["priority"]["id"]))


def test_deleting_parents_keeps_children_consistent(client, db):
    register(client)
    rows = _seed(client)
    client.delete(f"/api/challenges/{rows['challenge']['id']}")
    priority = client.get("/api/priorities").json()[0]
    assert priority["challenge_id"] is None and priority["challenge_title"] is None

    client.delete(f"/api/priorities/{rows['priority']['id']}")
    assert client.get("/api/decision-logs").json()[0]["priority_id"] is None

    client.delete(f"/api/stakeholders/{rows['stakeholder']['id']}")
    assert _sql(db, "select count(*) from beyond_todo.stakeholder_interests")[0][0] == 0


def test_db_enforces_weekly_priority_limit(client, db):
    register(client)
    week = current_week()
    for i in range(MAX_ACTIVE_PRIORITIES_PER_WEEK):
        client.post("/api/priorities", json={"title": f"P{i}"})
    (uid,) = _user_ids(db)
    insert = "insert into beyond_todo.priorities (user_id, title, target_week, status) values (%s, 'x', %s, %s)"

    with pytest.raises(psycopg.errors.CheckViolation):
        _sql(db, insert, (uid, week, "Not Started"))
    _sql(db, insert, (uid, week, "Completed"))  # completed ones do not count
    _sql(db, insert, (uid, "2001-W01", "Not Started"))  # other weeks are separate
    # Reopening a completed one is checked too
    with pytest.raises(psycopg.errors.CheckViolation):
        _sql(db, "update beyond_todo.priorities set status = 'In Progress' where status = 'Completed'")
    # Editing an existing unfinished one is not
    assert _sql(db, "update beyond_todo.priorities set title = 'renamed' where target_week = %s and status <> 'Completed'",
                (week,)) == MAX_ACTIVE_PRIORITIES_PER_WEEK


def test_concurrent_priority_creation_cannot_exceed_limit(client, db):
    register(client)
    week = current_week()
    for i in range(MAX_ACTIVE_PRIORITIES_PER_WEEK - 1):
        client.post("/api/priorities", json={"title": f"P{i}"})
    (uid,) = _user_ids(db)
    insert = "insert into beyond_todo.priorities (user_id, title, target_week) values (%s, %s, %s)"

    first = psycopg.connect(db)
    second = psycopg.connect(db)
    errors: list[Exception] = []

    def racer():
        try:
            second.execute(insert, (uid, "second", week))  # blocks on the advisory lock
            second.commit()
        except Exception as exc:  # noqa: BLE001
            errors.append(exc)
            second.rollback()

    try:
        first.execute(insert, (uid, "first", week))
        thread = threading.Thread(target=racer)
        thread.start()
        thread.join(0.5)
        assert thread.is_alive(), "second insert should wait for the first transaction"
        first.commit()
        thread.join(10)
    finally:
        first.close()
        second.close()

    assert len(errors) == 1 and isinstance(errors[0], psycopg.errors.CheckViolation)
    titles = [p["title"] for p in client.get("/api/priorities").json()]
    assert len(titles) == MAX_ACTIVE_PRIORITIES_PER_WEEK and "first" in titles


def test_api_maps_db_limit_violation_to_400(client, monkeypatch):
    """If the application check is bypassed (e.g. lost a race), the API still answers 400."""
    register(client)
    for i in range(MAX_ACTIVE_PRIORITIES_PER_WEEK):
        client.post("/api/priorities", json={"title": f"P{i}"})
    from backend.services import priorities as rules

    monkeypatch.setattr(rules, "ensure_capacity", lambda *a, **k: None)
    res = client.post("/api/priorities", json={"title": "over"})
    assert res.status_code == 400
    assert "最大5件" in res.json()["error"]
    assert len(client.get("/api/priorities").json()) == MAX_ACTIVE_PRIORITIES_PER_WEEK
