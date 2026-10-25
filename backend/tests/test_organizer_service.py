import os
import shutil
import tempfile
from pathlib import Path
import pytest
from backend.app.services.organizer_service import organizer_service
from backend.app.schemas.organizer import ApplyOperationsRequest, ProposedFileMove

@pytest.fixture
def sandbox_dir():
    temp_dir = tempfile.mkdtemp(prefix="sloth_test_organizer_")
    p = Path(temp_dir)
    
    # Create sample files
    (p / "report.pdf").write_text("dummy pdf", encoding="utf-8")
    (p / "notes.txt").write_text("dummy notes", encoding="utf-8")
    (p / "photo.png").write_text("dummy photo", encoding="utf-8")
    (p / "script.py").write_text("print('hello')", encoding="utf-8")
    (p / "data.csv").write_text("a,b,c", encoding="utf-8")
    
    yield p
    shutil.rmtree(temp_dir, ignore_errors=True)

def test_scan_directory(sandbox_dir):
    response = organizer_service.scan_directory(str(sandbox_dir))
    assert response.total_files == 5
    assert "Documents" in response.categories_summary
    assert "Images" in response.categories_summary
    assert "Code & Scripts" in response.categories_summary
    assert "Spreadsheets & Data" in response.categories_summary
    assert len(response.proposed_moves) == 5

def test_dry_run_mode(sandbox_dir):
    scan_res = organizer_service.scan_directory(str(sandbox_dir))
    req = ApplyOperationsRequest(
        directory_path=str(sandbox_dir),
        operations=scan_res.proposed_moves,
        dry_run=True,
        confirm=False,
    )
    apply_res = organizer_service.apply_operations(req)
    assert apply_res.dry_run is True
    assert apply_res.succeeded == 5
    assert apply_res.failed == 0
    
    # Verify files were NOT moved in dry-run
    assert (sandbox_dir / "report.pdf").exists()
    assert not (sandbox_dir / "Documents" / "report.pdf").exists()

def test_apply_operations_real_move(sandbox_dir):
    scan_res = organizer_service.scan_directory(str(sandbox_dir))
    req = ApplyOperationsRequest(
        directory_path=str(sandbox_dir),
        operations=scan_res.proposed_moves,
        dry_run=False,
        confirm=True,
        overwrite_strategy="rename",
    )
    apply_res = organizer_service.apply_operations(req)
    assert apply_res.dry_run is False
    assert apply_res.succeeded == 5
    
    # Check that destinations were created and files moved
    assert (sandbox_dir / "Documents" / "report.pdf").exists()
    assert (sandbox_dir / "Documents" / "notes.txt").exists()
    assert (sandbox_dir / "Images" / "photo.png").exists()
    assert (sandbox_dir / "Code_Scripts" / "script.py").exists()
    assert (sandbox_dir / "Spreadsheets_Data" / "data.csv").exists()

def test_conflict_rename_strategy(sandbox_dir):
    # Pre-create the destination folder and a conflicting file
    dest_folder = sandbox_dir / "Documents"
    dest_folder.mkdir(parents=True, exist_ok=True)
    (dest_folder / "notes.txt").write_text("existing content", encoding="utf-8")
    
    # Now scan and apply
    scan_res = organizer_service.scan_directory(str(sandbox_dir))
    req = ApplyOperationsRequest(
        directory_path=str(sandbox_dir),
        operations=scan_res.proposed_moves,
        dry_run=False,
        confirm=True,
        overwrite_strategy="rename",
    )
    apply_res = organizer_service.apply_operations(req)
    assert apply_res.succeeded >= 1
    # Check renamed file created without overwriting original
    assert (dest_folder / "notes.txt").read_text(encoding="utf-8") == "existing content"
    assert (dest_folder / "notes (1).txt").exists()

def test_protected_path_rejection():
    with pytest.raises(Exception) as exc_info:
        organizer_service.validate_directory("C:\\Windows")
    assert "protected" in str(exc_info.value).lower()
