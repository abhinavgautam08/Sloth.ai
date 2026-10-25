import sqlite3
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "organizer_history.db"

class HistoryDB:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS operation_batches (
                    batch_id TEXT PRIMARY KEY,
                    directory_path TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    dry_run INTEGER NOT NULL,
                    overwrite_strategy TEXT NOT NULL,
                    total_processed INTEGER NOT NULL,
                    succeeded INTEGER NOT NULL,
                    skipped INTEGER NOT NULL,
                    failed INTEGER NOT NULL,
                    status TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS file_operations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    batch_id TEXT NOT NULL,
                    original_path TEXT NOT NULL,
                    destination_path TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    category TEXT,
                    file_size INTEGER DEFAULT 0,
                    action_taken TEXT NOT NULL,
                    status TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    undo_timestamp TEXT,
                    undo_error TEXT,
                    FOREIGN KEY (batch_id) REFERENCES operation_batches(batch_id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_file_ops_batch ON file_operations(batch_id);
            """)

    def create_batch(
        self,
        batch_id: str,
        directory_path: str,
        dry_run: bool,
        overwrite_strategy: str,
        total_processed: int,
        succeeded: int,
        skipped: int,
        failed: int,
        status: str,
    ):
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO operation_batches (
                    batch_id, directory_path, timestamp, dry_run, overwrite_strategy,
                    total_processed, succeeded, skipped, failed, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    batch_id,
                    directory_path,
                    datetime.now().isoformat(),
                    1 if dry_run else 0,
                    overwrite_strategy,
                    total_processed,
                    succeeded,
                    skipped,
                    failed,
                    status,
                ),
            )

    def record_file_operation(
        self,
        batch_id: str,
        original_path: str,
        destination_path: str,
        filename: str,
        category: str,
        file_size: int,
        action_taken: str,
        status: str,
    ) -> int:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO file_operations (
                    batch_id, original_path, destination_path, filename, category,
                    file_size, action_taken, status, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    batch_id,
                    original_path,
                    destination_path,
                    filename,
                    category,
                    file_size,
                    action_taken,
                    status,
                    datetime.now().isoformat(),
                ),
            )
            return cursor.lastrowid

    def get_recent_batches(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM operation_batches
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM operation_batches WHERE batch_id = ?",
                (batch_id,),
            ).fetchone()
            return dict(row) if row else None

    def get_batch_operations(self, batch_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM file_operations
                WHERE batch_id = ?
                ORDER BY id ASC
                """,
                (batch_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def update_operation_status(
        self,
        op_id: int,
        status: str,
        undo_error: Optional[str] = None,
    ):
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE file_operations
                SET status = ?, undo_timestamp = ?, undo_error = ?
                WHERE id = ?
                """,
                (status, datetime.now().isoformat(), undo_error, op_id),
            )

    def update_batch_counts(
        self,
        batch_id: str,
        succeeded: int,
        skipped: int,
        failed: int,
        status: str,
    ):
        with self._get_connection() as conn:
            conn.execute(
                """
                UPDATE operation_batches
                SET succeeded = ?, skipped = ?, failed = ?, status = ?
                WHERE batch_id = ?
                """,
                (succeeded, skipped, failed, status, batch_id),
            )

    def update_batch_status(self, batch_id: str, status: str):
        with self._get_connection() as conn:
            conn.execute(
                "UPDATE operation_batches SET status = ? WHERE batch_id = ?",
                (status, batch_id),
            )

history_db = HistoryDB()
