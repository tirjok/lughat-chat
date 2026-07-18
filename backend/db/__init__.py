"""Data Access Layer — SQLite database helpers.

Exports ``get_db_connection`` which opens a SQLite connection with
safety pragmas applied.

Usage::

    from db import get_db_connection

    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT ...").fetchall()
    finally:
        conn.close()
"""

from __future__ import annotations

import sqlite3


def get_db_connection(db_path: str) -> sqlite3.Connection:
    """Open a SQLite connection with safety pragmas applied.

    Parameters
    ----------
    db_path : str
        Path to the SQLite database file.

    Returns
    -------
    sqlite3.Connection
        An open connection with foreign_keys, busy_timeout, journal_mode,
        and synchronous pragmas set.
    """
    from sqlite_safety import apply_safety_pragmas

    conn = sqlite3.connect(db_path)
    apply_safety_pragmas(conn)
    return conn


def get_db_connection_from_app() -> sqlite3.Connection:
    """Open a SQLite connection using the app's DB_PATH (for test compatibility).

    Checks for a test-level override (app.DB_PATH) first, then falls back
    to the configured DB_PATH.
    """
    import sys as _sys

    _m = _sys.modules.get("app")
    if _m is not None and hasattr(_m, "DB_PATH") and _m.DB_PATH:
        db_path = _m.DB_PATH
    else:
        from config import DB_PATH

        db_path = DB_PATH
    return get_db_connection(db_path)
