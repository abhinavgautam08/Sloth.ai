import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from fastapi import HTTPException
from ..schemas.organizer import (
    ProposedFileMove,
    ScanDirectoryResponse,
    ApplyOperationsRequest,
    ApplyOperationsResponse,
    OperationResult,
    UndoPreviewResponse,
    UndoItemPreview,
    UndoApplyResponse,
    UndoItemResult,
    BatchHistoryItem,
)
from .history_db import history_db

CATEGORY_MAPPING = {
    "Documents": [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf", ".odt", ".pages", ".tex", ".epub"],
    "Spreadsheets & Data": [".xlsx", ".xls", ".csv", ".tsv", ".json", ".xml", ".parquet", ".sql"],
    "Images": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".ico"],
    "Audio & Music": [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"],
    "Videos": [".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv"],
    "Archives": [".zip", ".tar", ".gz", ".7z", ".rar", ".bz2"],
    "Code & Scripts": [".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".rs", ".go", ".java", ".cpp", ".c", ".sh", ".bat", ".ps1"],
    "Installers": [".exe", ".msi", ".dmg", ".pkg", ".iso"],
}

# Protected system paths to prevent accidental damage
PROTECTED_PATHS = [
    "C:\\",
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "C:\\System32",
    "/",
    "/bin",
    "/usr",
    "/etc",
    "/System",
    "/Library",
    "/root",
    "/boot",
]

class OrganizerService:
    def __init__(self):
        self.db = history_db

    def _classify_file(self, extension: str) -> Tuple[str, str]:
        ext = extension.lower()
        for category, extensions in CATEGORY_MAPPING.items():
            if ext in extensions:
                folder_name = category.replace(" & ", "_").replace(" ", "_")
                return category, folder_name
        return "Miscellaneous", "Miscellaneous"

    def validate_directory(self, dir_path: str) -> Path:
        if not dir_path or not dir_path.strip():
            raise HTTPException(status_code=400, detail="Directory path cannot be empty.")

        try:
            p = Path(dir_path).resolve()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid path syntax: {str(e)}")

        # Check if root of drive (e.g. C:\, D:\, /)
        if p.parent == p:
            raise HTTPException(
                status_code=400,
                detail=f"Refusing to organize root drive directory: {dir_path}",
            )

        p_str = str(p).rstrip("\\/")
        for prot in PROTECTED_PATHS:
            prot_str = str(Path(prot).resolve()).rstrip("\\/")
            if p_str.lower() == prot_str.lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Refusing to organize protected system or root directory: {dir_path}",
                )

        if not p.exists():
            raise HTTPException(status_code=400, detail=f"Directory does not exist: {dir_path}")
        if not p.is_dir():
            raise HTTPException(status_code=400, detail=f"Specified path is not a directory: {dir_path}")

        return p

    def scan_directory(self, dir_path: str, use_ai: bool = False) -> ScanDirectoryResponse:
        resolved_path = self.validate_directory(dir_path)
        proposed_moves: List[ProposedFileMove] = []
        categories_summary: Dict[str, int] = {}
        warnings: List[str] = []

        try:
            entries = list(resolved_path.iterdir())
        except PermissionError:
            raise HTTPException(status_code=403, detail=f"Permission denied accessing directory: {dir_path}")

        file_entries = []
        for f in entries:
            # Skip directories
            if not f.is_file():
                continue
            # Handle symlinks safely: avoid moving symlinks pointing outside the directory
            if f.is_symlink():
                try:
                    target = f.resolve()
                    target.relative_to(resolved_path)
                except (ValueError, RuntimeError):
                    warnings.append(f"Skipping symlink '{f.name}' targeting external location.")
                    continue
            # Filter hidden files & system metadata
            if f.name.startswith(".") or f.name.lower() in ("desktop.ini", "thumbs.db"):
                continue
            file_entries.append(f)

        if len(file_entries) > 500:
            file_entries = file_entries[:500]
            warnings.append("Directory has over 500 files; showing preview for first 500 files.")

        for f in file_entries:
            ext = f.suffix
            category, folder_name = self._classify_file(ext)
            categories_summary[category] = categories_summary.get(category, 0) + 1

            dest_folder = resolved_path / folder_name
            target_file_path = dest_folder / f.name
            has_conflict = target_file_path.exists()

            try:
                size = f.stat().st_size
            except Exception:
                size = 0

            proposed_moves.append(
                ProposedFileMove(
                    original_path=str(f),
                    filename=f.name,
                    file_size=size,
                    extension=ext,
                    category=category,
                    suggested_folder=folder_name,
                    proposed_path=str(target_file_path),
                    has_conflict=has_conflict,
                    status="conflict" if has_conflict else "pending",
                )
            )

        return ScanDirectoryResponse(
            directory_path=str(resolved_path),
            total_files=len(proposed_moves),
            categories_summary=categories_summary,
            proposed_moves=proposed_moves,
            warnings=warnings,
        )

    def _resolve_conflict_name(self, dest_path: Path) -> Path:
        parent = dest_path.parent
        stem = dest_path.stem
        suffix = dest_path.suffix
        counter = 1
        new_path = parent / f"{stem} ({counter}){suffix}"
        while new_path.exists():
            counter += 1
            new_path = parent / f"{stem} ({counter}){suffix}"
        return new_path

    def apply_operations(self, request: ApplyOperationsRequest) -> ApplyOperationsResponse:
        resolved_dir = self.validate_directory(request.directory_path)

        if not request.confirm and not request.dry_run:
            raise HTTPException(
                status_code=400,
                detail="Explicit confirmation (confirm=True) is required to apply file operations.",
            )

        batch_id = str(uuid.uuid4())
        results: List[OperationResult] = []
        succeeded = 0
        skipped = 0
        failed = 0

        # Create batch in SQLite upfront with in_progress status
        self.db.create_batch(
            batch_id=batch_id,
            directory_path=str(resolved_dir),
            dry_run=request.dry_run,
            overwrite_strategy=request.overwrite_strategy,
            total_processed=len(request.operations),
            succeeded=0,
            skipped=0,
            failed=0,
            status="simulated" if request.dry_run else "in_progress",
        )

        for op in request.operations:
            src = Path(op.original_path).resolve()
            dest = Path(op.proposed_path).resolve()

            # Path Traversal & Security Validation: BOTH src AND dest must be within resolved_dir
            try:
                src.relative_to(resolved_dir)
            except ValueError:
                results.append(
                    OperationResult(
                        original_path=op.original_path,
                        destination_path=op.proposed_path,
                        action_taken="skipped_security",
                        success=False,
                        message="Security violation: source file is outside the validated target directory tree.",
                    )
                )
                skipped += 1
                continue

            try:
                dest.relative_to(resolved_dir)
            except ValueError:
                results.append(
                    OperationResult(
                        original_path=op.original_path,
                        destination_path=op.proposed_path,
                        action_taken="skipped_security",
                        success=False,
                        message="Security violation: destination is outside the validated target directory tree.",
                    )
                )
                skipped += 1
                continue

            # Symlink guard
            if src.is_symlink():
                try:
                    src.resolve().relative_to(resolved_dir)
                except ValueError:
                    results.append(
                        OperationResult(
                            original_path=op.original_path,
                            destination_path=op.proposed_path,
                            action_taken="skipped_symlink",
                            success=False,
                            message="Security violation: symlink points outside the target directory.",
                        )
                    )
                    skipped += 1
                    continue

            if not src.exists() or not src.is_file():
                results.append(
                    OperationResult(
                        original_path=op.original_path,
                        destination_path=op.proposed_path,
                        action_taken="failed_not_found",
                        success=False,
                        message="Source file does not exist or is not a regular file.",
                    )
                )
                failed += 1
                continue

            # Conflict handling
            conflict_action = "moved"
            if dest.exists() and dest != src:
                if request.overwrite_strategy == "skip":
                    results.append(
                        OperationResult(
                            original_path=op.original_path,
                            destination_path=str(dest),
                            action_taken="skipped_conflict",
                            success=True,
                            message="Destination already exists. Skipped per strategy.",
                        )
                    )
                    skipped += 1
                    continue
                elif request.overwrite_strategy == "rename":
                    dest = self._resolve_conflict_name(dest)
                    conflict_action = "renamed_conflict"
                elif request.overwrite_strategy == "overwrite":
                    conflict_action = "overwritten"

            if request.dry_run:
                results.append(
                    OperationResult(
                        original_path=str(src),
                        destination_path=str(dest),
                        action_taken=f"simulated_{conflict_action}",
                        success=True,
                        message=f"Dry run: Would move '{src.name}' -> '{dest.name}'",
                    )
                )
                succeeded += 1
            else:
                try:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(src), str(dest))
                    
                    # Record persistent SQLite log only after filesystem move succeeds
                    self.db.record_file_operation(
                        batch_id=batch_id,
                        original_path=str(src),
                        destination_path=str(dest),
                        filename=src.name,
                        category=op.category,
                        file_size=op.file_size,
                        action_taken=conflict_action,
                        status="applied",
                    )
                    
                    results.append(
                        OperationResult(
                            original_path=str(src),
                            destination_path=str(dest),
                            action_taken=conflict_action,
                            success=True,
                            message=f"Successfully moved to '{dest.name}'.",
                        )
                    )
                    succeeded += 1
                except Exception as e:
                    results.append(
                        OperationResult(
                            original_path=str(src),
                            destination_path=str(dest),
                            action_taken="error",
                            success=False,
                            message=f"Failed to move file: {str(e)}",
                        )
                    )
                    failed += 1

        # Update batch summary in SQLite
        batch_status = "simulated" if request.dry_run else ("applied" if failed == 0 else "partially_failed")
        self.db.update_batch_counts(
            batch_id=batch_id,
            succeeded=succeeded,
            skipped=skipped,
            failed=failed,
            status=batch_status,
        )

        return ApplyOperationsResponse(
            batch_id=batch_id,
            dry_run=request.dry_run,
            total_processed=len(request.operations),
            succeeded=succeeded,
            skipped=skipped,
            failed=failed,
            results=results,
            timestamp=datetime.now().isoformat(),
        )

    def get_history(self) -> List[BatchHistoryItem]:
        batches = self.db.get_recent_batches(limit=25)
        return [
            BatchHistoryItem(
                batch_id=b["batch_id"],
                directory_path=b["directory_path"],
                timestamp=b["timestamp"],
                dry_run=bool(b["dry_run"]),
                overwrite_strategy=b["overwrite_strategy"],
                total_processed=b["total_processed"],
                succeeded=b["succeeded"],
                skipped=b["skipped"],
                failed=b["failed"],
                status=b["status"],
            )
            for b in batches
        ]

    def preview_undo(self, batch_id: str) -> UndoPreviewResponse:
        batch = self.db.get_batch(batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail=f"Operation batch '{batch_id}' not found.")
        
        if batch["dry_run"]:
            raise HTTPException(status_code=400, detail="Cannot undo a dry-run simulation batch.")
        
        if batch["status"] == "undone":
            raise HTTPException(status_code=400, detail="This operation batch has already been undone.")

        operations = self.db.get_batch_operations(batch_id)
        items: List[UndoItemPreview] = []
        can_undo_count = 0
        conflict_count = 0

        for op in operations:
            if op["status"] != "applied":
                continue

            dest = Path(op["destination_path"])
            orig = Path(op["original_path"])
            
            can_undo = True
            reason = "Ready to restore."

            # Verify moved file still exists at destination
            if not dest.exists() or not dest.is_file():
                can_undo = False
                reason = f"Moved file missing at destination ({dest.name})."
                conflict_count += 1
            # Verify original location is not occupied
            elif orig.exists():
                can_undo = False
                reason = f"Original location is occupied by existing file ({orig.name}). Overwrite prevented."
                conflict_count += 1
            else:
                can_undo_count += 1

            items.append(
                UndoItemPreview(
                    op_id=op["id"],
                    original_path=op["original_path"],
                    destination_path=op["destination_path"],
                    filename=op["filename"],
                    can_undo=can_undo,
                    reason=reason,
                )
            )

        return UndoPreviewResponse(
            batch_id=batch_id,
            directory_path=batch["directory_path"],
            total_items=len(items),
            can_undo_count=can_undo_count,
            conflict_count=conflict_count,
            items=items,
        )

    def apply_undo(self, batch_id: str, confirm: bool = False) -> UndoApplyResponse:
        if not confirm:
            raise HTTPException(status_code=400, detail="Explicit confirmation (confirm=True) is required to execute rollback.")

        batch = self.db.get_batch(batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail=f"Operation batch '{batch_id}' not found.")
        
        if batch["dry_run"]:
            raise HTTPException(status_code=400, detail="Cannot undo a dry-run simulation batch.")
        
        if batch["status"] == "undone":
            raise HTTPException(status_code=400, detail="This operation batch has already been undone.")

        operations = self.db.get_batch_operations(batch_id)
        results: List[UndoItemResult] = []
        succeeded = 0
        failed = 0

        for op in operations:
            if op["status"] != "applied":
                continue

            op_id = op["id"]
            dest = Path(op["destination_path"])
            orig = Path(op["original_path"])

            # Strict pre-checks before move
            if not dest.exists() or not dest.is_file():
                err = f"Destination file '{dest.name}' does not exist or is not a file."
                self.db.update_operation_status(op_id, "failed_undo", undo_error=err)
                results.append(
                    UndoItemResult(
                        op_id=op_id,
                        original_path=str(orig),
                        destination_path=str(dest),
                        success=False,
                        message=err,
                    )
                )
                failed += 1
                continue

            if orig.exists():
                err = f"Original location '{orig.name}' is occupied. Overwrite prevented."
                self.db.update_operation_status(op_id, "failed_undo", undo_error=err)
                results.append(
                    UndoItemResult(
                        op_id=op_id,
                        original_path=str(orig),
                        destination_path=str(dest),
                        success=False,
                        message=err,
                    )
                )
                failed += 1
                continue

            try:
                # Safe restore
                orig.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(dest), str(orig))

                # Clean up empty parent folder if no other files remain
                parent_dir = dest.parent
                if parent_dir.exists() and not any(parent_dir.iterdir()):
                    try:
                        parent_dir.rmdir()
                    except Exception:
                        pass

                self.db.update_operation_status(op_id, "undone")
                results.append(
                    UndoItemResult(
                        op_id=op_id,
                        original_path=str(orig),
                        destination_path=str(dest),
                        success=True,
                        message=f"Restored '{orig.name}' back to original directory.",
                    )
                )
                succeeded += 1
            except Exception as e:
                err = f"Error moving file back: {str(e)}"
                self.db.update_operation_status(op_id, "failed_undo", undo_error=err)
                results.append(
                    UndoItemResult(
                        op_id=op_id,
                        original_path=str(orig),
                        destination_path=str(dest),
                        success=False,
                        message=err,
                    )
                )
                failed += 1

        # Update batch status in SQLite
        if failed == 0 and succeeded > 0:
            self.db.update_batch_status(batch_id, "undone")
        elif succeeded > 0:
            self.db.update_batch_status(batch_id, "partially_undone")

        return UndoApplyResponse(
            batch_id=batch_id,
            total_attempted=len(results),
            succeeded=succeeded,
            failed=failed,
            results=results,
            timestamp=datetime.now().isoformat(),
        )

organizer_service = OrganizerService()
