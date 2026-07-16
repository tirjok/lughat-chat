"""SQLite safety pragma helper.

Applies the "edition 2026" safety defaults from mort.coffee:

  - PRAGMA foreign_keys = ON
  - PRAGMA busy_timeout = 5000  (5 seconds)
  - PRAGMA journal_mode = WAL
  - PRAGMA synchronous = NORMAL

Import and call ``apply_safety_pragmas(conn)`` immediately after
``sqlite3.connect()`` on every database connection.

Usage::

    conn = sqlite3.connect("my_database.db")
    apply_safety_pragmas(conn)
    # ... now all four safety defaults are active
"""

import sqlite3


def apply_safety_pragmas(conn: sqlite3.Connection) -> None:
    """Apply all "edition 2026" safety pragmas to a connection.

    This function is idempotent — calling it multiple times on the same
    connection is safe and has no side effects.

    Parameters
    ----------
    conn : sqlite3.Connection
        An already-open SQLite connection.  The pragmas are applied
        in-place and affect all subsequent operations on this connection.
    """
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
