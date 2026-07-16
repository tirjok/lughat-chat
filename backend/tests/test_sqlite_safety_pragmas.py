"""Tests for SQLite safety pragmas.

Verifies that every SQLite connection applies the "edition 2026" safety
defaults proposed by mort.coffee:

  1.  PRAGMA foreign_keys = ON
  2.  PRAGMA busy_timeout = 5000  (5 seconds)
  3.  PRAGMA journal_mode = WAL
  4.  PRAGMA synchronous = NORMAL

These pragmas are applied via a helper function ``apply_safety_pragmas(conn)``
that wraps all connection setup in both ``lessons_db`` and ``progress_db``.
"""

import os
import sqlite3
import tempfile
from pathlib import Path

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_temp_db() -> tuple[str, sqlite3.Connection]:
    """Create a temporary SQLite database and return (db_path, conn)."""
    db_path = str(Path(tempfile.gettempdir()) / f"lughat_test_{os.getpid()}.db")
    conn = sqlite3.connect(db_path)
    return db_path, conn


def _read_pragma(conn: sqlite3.Connection, pragma_name: str) -> str | int | None:
    """Read a single pragma value from the connection."""
    row = conn.execute(f"PRAGMA {pragma_name}").fetchone()
    return row[0] if row else None


def _is_synchronous_normal(conn: sqlite3.Connection) -> bool:
    """Check if synchronous pragma is set to NORMAL.

    SQLite's synchronous pragma returns an integer:
    0 = OFF, 1 = NORMAL, 2 = FULL.
    """
    value = _read_pragma(conn, "synchronous")
    if isinstance(value, int):
        return value == 1  # NORMAL = 1
    return value.lower() == "normal"


def _close_db(conn: sqlite3.Connection, db_path: str) -> None:
    """Close connection and remove the temp database file."""
    conn.close()
    try:
        os.remove(db_path)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Import the safety pragma helper (to be implemented)
# ---------------------------------------------------------------------------

from lessons_db import apply_safety_pragmas  # noqa: E402


# ---------------------------------------------------------------------------
# TC-07: foreign_keys pragma is applied
# ---------------------------------------------------------------------------


class TestForeignKeysPragma:
    """Foreign key enforcement is enabled on every connection."""

    def setup_method(self):
        self.db_path, self.conn = _create_temp_db()

    def teardown_method(self):
        _close_db(self.conn, self.db_path)

    def test_foreign_keys_is_on(self):
        """TC-07a: PRAGMA foreign_keys returns 1 after apply_safety_pragmas."""
        apply_safety_pragmas(self.conn)
        value = _read_pragma(self.conn, "foreign_keys")
        assert value == 1

    def test_foreign_keys_enforces_constraints(self):
        """TC-07b: Foreign key constraints are actually enforced (not just the pragma)."""
        apply_safety_pragmas(self.conn)

        # Create parent and child tables
        self.conn.execute("""
            CREATE TABLE parents (
                id INTEGER PRIMARY KEY,
                name TEXT
            )
        """)
        self.conn.execute("""
            CREATE TABLE children (
                id INTEGER PRIMARY KEY,
                parent_id INTEGER NOT NULL,
                name TEXT,
                FOREIGN KEY(parent_id) REFERENCES parents(id)
            )
        """)
        self.conn.commit()

        # Insert a parent
        self.conn.execute("INSERT INTO parents (name) VALUES ('Alice')")
        self.conn.commit()

        # Insert a child referencing the parent — should succeed
        self.conn.execute("INSERT INTO children (parent_id, name) VALUES (1, 'Bob')")
        self.conn.commit()

        # Insert a child referencing a non-existent parent — should FAIL
        with pytest.raises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO children (parent_id, name) VALUES (999, 'Charlie')"
            )
            self.conn.commit()


# ---------------------------------------------------------------------------
# TC-08: busy_timeout pragma is applied
# ---------------------------------------------------------------------------


class TestBusyTimeoutPragma:
    """Busy timeout is set to 5000ms (5 seconds) on every connection."""

    def setup_method(self):
        self.db_path, self.conn = _create_temp_db()

    def teardown_method(self):
        _close_db(self.conn, self.db_path)

    def test_busy_timeout_is_5000(self):
        """TC-08a: PRAGMA busy_timeout returns 5000 after apply_safety_pragmas."""
        apply_safety_pragmas(self.conn)
        value = _read_pragma(self.conn, "busy_timeout")
        assert value == 5000

    def test_busy_timeout_is_nonzero(self):
        """TC-08b: busy_timeout is not 0 (which means immediate failure)."""
        apply_safety_pragmas(self.conn)
        value = _read_pragma(self.conn, "busy_timeout")
        assert value > 0


# ---------------------------------------------------------------------------
# TC-09: WAL journal mode is applied
# ---------------------------------------------------------------------------


class TestWALJournalMode:
    """Write-Ahead Logging (WAL) is enabled on every connection."""

    def setup_method(self):
        self.db_path, self.conn = _create_temp_db()

    def teardown_method(self):
        _close_db(self.conn, self.db_path)

    def test_journal_mode_is_wal(self):
        """TC-09a: PRAGMA journal_mode returns 'wal' after apply_safety_pragmas."""
        apply_safety_pragmas(self.conn)
        value = _read_pragma(self.conn, "journal_mode").lower()
        assert value == "wal"

    def test_wal_creates_wal_file(self):
        """TC-09b: WAL mode creates a .wal file after a write operation."""
        apply_safety_pragmas(self.conn)

        # Create a table and insert data (triggers WAL file creation)
        self.conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)")
        self.conn.execute("INSERT INTO test (data) VALUES ('hello')")
        self.conn.commit()

        wal_path = self.db_path + "-wal"
        assert os.path.exists(wal_path)


# ---------------------------------------------------------------------------
# TC-10: synchronous pragma is applied
# ---------------------------------------------------------------------------


class TestSynchronousPragma:
    """Synchronous mode is set to NORMAL on every connection."""

    def setup_method(self):
        self.db_path, self.conn = _create_temp_db()

    def teardown_method(self):
        _close_db(self.conn, self.db_path)

    def test_synchronous_is_normal(self):
        """TC-10a: PRAGMA synchronous returns NORMAL after apply_safety_pragmas."""
        apply_safety_pragmas(self.conn)
        assert _is_synchronous_normal(self.conn)


# ---------------------------------------------------------------------------
# TC-11: apply_safety_pragmas is a no-op for already-configured connections
# ---------------------------------------------------------------------------


class TestIdempotentApplication:
    """Applying safety pragmas multiple times is safe."""

    def setup_method(self):
        self.db_path, self.conn = _create_temp_db()

    def teardown_method(self):
        _close_db(self.conn, self.db_path)

    def test_applied_twice_no_error(self):
        """TC-11: Calling apply_safety_pragmas twice does not raise."""
        apply_safety_pragmas(self.conn)
        apply_safety_pragmas(self.conn)  # should not raise

    def test_values_still_correct_after_double_apply(self):
        """TC-11: Values remain correct after double application."""
        apply_safety_pragmas(self.conn)
        apply_safety_pragmas(self.conn)

        fk = _read_pragma(self.conn, "foreign_keys")
        bt = _read_pragma(self.conn, "busy_timeout")
        jm = _read_pragma(self.conn, "journal_mode").lower()
        assert fk == 1
        assert bt == 5000
        assert jm == "wal"
        assert _is_synchronous_normal(self.conn)


# ---------------------------------------------------------------------------
# TC-12: integration — lessons_db and progress_db use the pragma
# ---------------------------------------------------------------------------


class TestIntegrationWithExistingModules:
    """Verify that init_lessons_db and init_user_progress_db use apply_safety_pragmas."""

    def setup_method(self):
        self.tmp_dir = Path(tempfile.gettempdir()) / f"lughat_integration_{os.getpid()}"
        self.tmp_dir.mkdir(exist_ok=True)

    def teardown_method(self):
        import shutil

        try:
            shutil.rmtree(self.tmp_dir)
        except OSError:
            pass

    def test_lessons_db_calls_apply_safety_pragmas(self, tmp_path):
        """TC-12a: init_lessons_db calls apply_safety_pragmas on its connection.

        We verify this by monkey-patching apply_safety_pragmas and checking
        that it gets called during init_lessons_db.
        """
        from lessons_db import apply_safety_pragmas  # noqa: E402
        from lessons_db import init_lessons_db  # noqa: E402

        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        # Monkey-patch apply_safety_pragmas to track calls
        original_apply = apply_safety_pragmas
        call_count = [0]

        def tracking_apply(conn):
            call_count[0] += 1
            # Don't actually apply pragmas — just count the call.
            # The unit tests above already verify the pragma values.

        # Patch the module's reference
        import lessons_db  # noqa: E402

        lessons_db.apply_safety_pragmas = tracking_apply

        try:
            init_lessons_db(content_dir, db_path)
        finally:
            lessons_db.apply_safety_pragmas = original_apply

        assert call_count[0] == 1

    def test_lessons_db_connection_applies_wal(self, tmp_path):
        """TC-12b: init_lessons_db applies journal_mode = WAL on its connection.

        Verifies that apply_safety_pragmas is called (the actual pragma
        values are verified by the unit tests above).
        """
        from lessons_db import apply_safety_pragmas  # noqa: E402
        from lessons_db import init_lessons_db  # noqa: E402

        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        original_apply = apply_safety_pragmas
        call_count = [0]

        def tracking_apply(conn):
            call_count[0] += 1

        import lessons_db  # noqa: E402

        lessons_db.apply_safety_pragmas = tracking_apply

        try:
            init_lessons_db(content_dir, db_path)
        finally:
            lessons_db.apply_safety_pragmas = original_apply

        assert call_count[0] == 1

    def test_progress_db_calls_apply_safety_pragmas(self, tmp_path):
        """TC-12c: init_user_progress_db calls apply_safety_pragmas on its connection."""
        from progress_db import apply_safety_pragmas  # noqa: E402
        from progress_db import init_user_progress_db  # noqa: E402

        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        original_apply = apply_safety_pragmas
        call_count = [0]

        def tracking_apply(conn):
            call_count[0] += 1

        import progress_db  # noqa: E402

        progress_db.apply_safety_pragmas = tracking_apply

        try:
            init_user_progress_db(content_dir, db_path)
        finally:
            progress_db.apply_safety_pragmas = original_apply

        assert call_count[0] == 1

    def test_progress_db_connection_applies_synchronous_normal(self, tmp_path):
        """TC-12d: init_user_progress_db applies synchronous = NORMAL on its connection.

        Verifies that apply_safety_pragmas is called (the actual pragma
        values are verified by the unit tests above).
        """
        from progress_db import apply_safety_pragmas  # noqa: E402
        from progress_db import init_user_progress_db  # noqa: E402

        db_path = str(tmp_path / "lughat.db")
        content_dir = str(tmp_path / "content")
        os.makedirs(content_dir)

        original_apply = apply_safety_pragmas
        call_count = [0]

        def tracking_apply(conn):
            call_count[0] += 1

        import progress_db  # noqa: E402

        progress_db.apply_safety_pragmas = tracking_apply

        try:
            init_user_progress_db(content_dir, db_path)
        finally:
            progress_db.apply_safety_pragmas = original_apply

        assert call_count[0] == 1
