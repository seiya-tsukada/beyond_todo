"""PostgreSQL access (Supabase) via psycopg.

Each request opens one short-lived connection and runs inside a single
transaction: committed when the request handler succeeds, rolled back on error.
Use Supabase's transaction pooler URL (port 6543) on Vercel; prepared statements
are disabled because the pooler does not support them.

With DATA_BACKEND=mock no database is used: the repositories return static data
and the "connection" passed to them is None.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import AbstractContextManager, nullcontext
from typing import Any

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from .config import get_settings

SCHEMA = "beyond_todo"

Conn = psycopg.Connection[dict[str, Any]]


def connect() -> AbstractContextManager[Conn]:
    """Open a connection; use as `with connect() as conn:` (commits on success)."""
    settings = get_settings()
    if settings.data_backend == "mock":
        return nullcontext(None)  # type: ignore[arg-type]
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    return psycopg.connect(settings.database_url, row_factory=dict_row, prepare_threshold=None)


def get_conn() -> Iterator[Conn]:
    """FastAPI dependency: one transaction per request."""
    with connect() as conn:
        yield conn


def table(name: str) -> sql.Composed:
    return sql.SQL("{}.{}").format(sql.Identifier(SCHEMA), sql.Identifier(name))


def fetch_one(conn: Conn, query: sql.Composable | str, params: Any = None) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchone()


def fetch_all(conn: Conn, query: sql.Composable | str, params: Any = None) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def execute(conn: Conn, query: sql.Composable | str, params: Any = None) -> int:
    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.rowcount


def insert(conn: Conn, table_name: str, values: dict[str, Any]) -> dict[str, Any]:
    query = sql.SQL("insert into {} ({}) values ({}) returning *").format(
        table(table_name),
        sql.SQL(", ").join(map(sql.Identifier, values)),
        sql.SQL(", ").join(sql.Placeholder(k) for k in values),
    )
    row = fetch_one(conn, query, values)
    assert row is not None
    return row


def update_owned(
    conn: Conn, table_name: str, user_id: str, row_id: str, values: dict[str, Any]
) -> dict[str, Any] | None:
    """Update a row that belongs to `user_id`. Returns None when it does not exist."""
    if not values:
        return fetch_one(
            conn,
            sql.SQL("select * from {} where id = %(id)s and user_id = %(user_id)s").format(table(table_name)),
            {"id": row_id, "user_id": user_id},
        )
    query = sql.SQL("update {} set {} where id = %(__id)s and user_id = %(__user_id)s returning *").format(
        table(table_name),
        sql.SQL(", ").join(sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in values),
    )
    return fetch_one(conn, query, {**values, "__id": row_id, "__user_id": user_id})


def delete_owned(conn: Conn, table_name: str, user_id: str, row_id: str) -> bool:
    query = sql.SQL("delete from {} where id = %s and user_id = %s").format(table(table_name))
    return execute(conn, query, (row_id, user_id)) > 0
