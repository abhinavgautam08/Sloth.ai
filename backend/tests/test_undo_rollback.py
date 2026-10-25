import tempfile
import shutil
from pathlib import Path
import pytest
from fastapi import HTTPException

from backend.app.services.organizer_service import OrganizerService
from backend.app.services.history_db import HistoryDB
from backend.app.schemas.organizer import ApplyOperationsRequest, ProposedFileMove

@pytest.fixture
def temp_organizer():
    temp_dir = tempfile.mkdtemp(prefix="sloth_test_undo_")
    db_file = Path(temp_dir) / "test_history.db"
    test_db = HistoryDB(db_path=db_file)
    
    service = OrganizerService()
    service.db = test_db
    
    p = Path(temp_dir) / "workspace"
    p.mkdir()
    
    (p / "doc1.pdf").write_text("dummy pdf", encoding="utf-8")
    (p / "notes.txt").write_text("dummy notes", encoding="utf-8")
    (p / "script.py").write_text("print('test')", encoding="utf-8")
    
    yield service, p, test_db
    shutil.rmtree(temp_dir, ignore_errors=True)

def test_successful_move_and_undo(temp_organizer):
    service, p, db = temp_organizer
    scan_res = service.scan_directory(str(p))
    assert scan_res.total_files == 3

    # Apply real move
    apply_req = ApplyOperationsRequest(
        directory_path=str(p),
        operations=scan_res.proposed_moves,
        dry_run=False,
        confirm=True,
    )
    apply_res = service.apply_operations(apply_req)
    assert apply_res.succeeded == 3
    batch_id = apply_res.batch_id
    assert batch_id is not None

    # Check that original files were moved
    assert not (p / "doc1.pdf").exists()
    assert (p / "Documents" / "doc1.pdf").exists()

    # Preview undo
    preview_res = service.preview_undo(batch_id)
    assert preview_res.total_items == 3
    assert preview_res.can_undo_count == 3
    assert preview_res.conflict_count == 0

    # Apply undo
    undo_res = service.apply_undo(batch_id, confirm=True)
    assert undo_res.succeeded == 3
    assert undo_res.failed == 0

    # Verify restored files at original location
    assert (p / "doc1.pdf").exists()
    assert (p / "notes.txt").exists()
    assert (p / "script.py").exists()

    # Verify destination subfolders cleaned up if empty
    assert not (p / "Documents").exists()

def test_undo_requires_confirmation(temp_organizer):
    service, p, _ = temp_organizer
    scan_res = service.scan_directory(str(p))
    apply_res = service.apply_operations(
        ApplyOperationsRequest(
            directory_path=str(p),
            operations=scan_res.proposed_moves,
            dry_run=False,
            confirm=True,
        )
    )
    batch_id = apply_res.batch_id
    
    with pytest.raises(HTTPException) as exc_info:
        service.apply_undo(batch_id, confirm=False)
    assert exc_info.value.status_code == 400
    assert "confirmation" in str(exc_info.value.detail).lower()

def test_undo_duplicate_prevention(temp_organizer):
    service, p, _ = temp_organizer
    scan_res = service.scan_directory(str(p))
    apply_res = service.apply_operations(
        ApplyOperationsRequest(
            directory_path=str(p),
            operations=scan_res.proposed_moves,
            dry_run=False,
            confirm=True,
        )
    )
    batch_id = apply_res.batch_id

    # First undo succeeds
    undo_res1 = service.apply_undo(batch_id, confirm=True)
    assert undo_res1.succeeded == 3

    # Second undo request is rejected
    with pytest.raises(HTTPException) as exc_info:
        service.apply_undo(batch_id, confirm=True)
    assert "already been undone" in str(exc_info.value.detail).lower()

def test_undo_occupied_conflict_prevention(temp_organizer):
    service, p, _ = temp_organizer
    scan_res = service.scan_directory(str(p))
    apply_res = service.apply_operations(
        ApplyOperationsRequest(
            directory_path=str(p),
            operations=scan_res.proposed_moves,
            dry_run=False,
            confirm=True,
        )
    )
    batch_id = apply_res.batch_id

    # Place a new conflicting file at the original location of doc1.pdf
    (p / "doc1.pdf").write_text("new occupant", encoding="utf-8")

    # Preview should report conflict
    preview_res = service.preview_undo(batch_id)
    assert preview_res.conflict_count >= 1
    doc1_preview = next(item for item in preview_res.items if item.filename == "doc1.pdf")
    assert doc1_preview.can_undo is False
    assert "occupied" in doc1_preview.reason.lower()

    # Apply undo should safely skip overwriting the occupant
    undo_res = service.apply_undo(batch_id, confirm=True)
    assert undo_res.failed >= 1
    assert (p / "doc1.pdf").read_text(encoding="utf-8") == "new occupant"
    # Ensure destination file was NOT deleted or overwritten
    assert (p / "Documents" / "doc1.pdf").exists()

def test_undo_missing_destination_file(temp_organizer):
    service, p, _ = temp_organizer
    scan_res = service.scan_directory(str(p))
    apply_res = service.apply_operations(
        ApplyOperationsRequest(
            directory_path=str(p),
            operations=scan_res.proposed_moves,
            dry_run=False,
            confirm=True,
        )
    )
    batch_id = apply_res.batch_id

    # Delete destination file manually to simulate user deleting it outside app
    dest_file = p / "Documents" / "doc1.pdf"
    dest_file.unlink()

    preview = service.preview_undo(batch_id)
    doc1_preview = next(item for item in preview.items if item.filename == "doc1.pdf")
    assert doc1_preview.can_undo is False
    assert "missing" in doc1_preview.reason.lower()

    undo_res = service.apply_undo(batch_id, confirm=True)
    assert undo_res.failed >= 1
    assert any("does not exist" in r.message for r in undo_res.results)

def test_history_persistence_across_restarts(temp_organizer):
    service, p, test_db = temp_organizer
    scan_res = service.scan_directory(str(p))
    apply_res = service.apply_operations(
        ApplyOperationsRequest(
            directory_path=str(p),
            operations=scan_res.proposed_moves,
            dry_run=False,
            confirm=True,
        )
    )
    batch_id = apply_res.batch_id

    # Create a fresh service instance sharing the same SQLite DB file
    fresh_service = OrganizerService()
    fresh_service.db = test_db

    history = fresh_service.get_history()
    assert len(history) >= 1
    persisted_batch = next(b for b in history if b.batch_id == batch_id)
    assert persisted_batch.succeeded == 3
    assert persisted_batch.status == "applied"

def test_destination_path_traversal_rejection(temp_organizer):
    service, p, _ = temp_organizer
    
    # Construct malicious operation where destination attempts to escape target directory
    malicious_op = ProposedFileMove(
        original_path=str(p / "notes.txt"),
        filename="notes.txt",
        file_size=10,
        extension=".txt",
        category="Documents",
        suggested_folder="Documents",
        proposed_path=str(p.parent / "escaped_secret.txt"),  # Outside p!
    )
    req = ApplyOperationsRequest(
        directory_path=str(p),
        operations=[malicious_op],
        dry_run=False,
        confirm=True,
    )
    res = service.apply_operations(req)
    assert res.succeeded == 0
    assert res.skipped == 1
    assert "security violation" in res.results[0].message.lower()

def test_dry_run_batch_cannot_be_undone(temp_organizer):
    service, p, _ = temp_organizer
    scan_res = service.scan_directory(str(p))
    apply_res = service.apply_operations(
        ApplyOperationsRequest(
            directory_path=str(p),
            operations=scan_res.proposed_moves,
            dry_run=True,
            confirm=False,
        )
    )
    batch_id = apply_res.batch_id
    with pytest.raises(HTTPException) as exc_info:
        service.preview_undo(batch_id)
    assert exc_info.value.status_code == 400
    assert "dry-run" in str(exc_info.value.detail).lower()

def test_invalid_batch_id_raises_404(temp_organizer):
    service, _, _ = temp_organizer
    with pytest.raises(HTTPException) as exc_info:
        service.preview_undo("non-existent-batch-id-12345")
    assert exc_info.value.status_code == 404
