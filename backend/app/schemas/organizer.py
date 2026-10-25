from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal

class ProposedFileMove(BaseModel):
    original_path: str
    filename: str
    file_size: int
    extension: str
    category: str
    suggested_folder: str
    proposed_path: str
    has_conflict: bool = False
    status: str = "pending"
    error_message: Optional[str] = None

class ScanDirectoryRequest(BaseModel):
    directory_path: str = Field(..., description="Absolute path of directory to scan")
    use_ai_classification: bool = Field(False, description="Whether to invoke local AI for ambiguous extensions")

class ScanDirectoryResponse(BaseModel):
    directory_path: str
    total_files: int
    categories_summary: Dict[str, int]
    proposed_moves: List[ProposedFileMove]
    warnings: List[str] = []

class ApplyOperationsRequest(BaseModel):
    directory_path: str
    operations: List[ProposedFileMove]
    dry_run: bool = True
    overwrite_strategy: Literal["skip", "rename", "overwrite"] = "rename"
    confirm: bool = Field(False, description="Explicit confirmation required to apply moves")

class OperationResult(BaseModel):
    original_path: str
    destination_path: str
    action_taken: str
    success: bool
    message: str

class ApplyOperationsResponse(BaseModel):
    batch_id: Optional[str] = None
    dry_run: bool
    total_processed: int
    succeeded: int
    skipped: int
    failed: int
    results: List[OperationResult]
    timestamp: str

# --- Undo & History Schemas ---

class UndoItemPreview(BaseModel):
    op_id: int
    original_path: str
    destination_path: str
    filename: str
    can_undo: bool
    reason: Optional[str] = None

class UndoPreviewRequest(BaseModel):
    batch_id: str

class UndoPreviewResponse(BaseModel):
    batch_id: str
    directory_path: str
    total_items: int
    can_undo_count: int
    conflict_count: int
    items: List[UndoItemPreview]

class UndoApplyRequest(BaseModel):
    batch_id: str
    confirm: bool = Field(False, description="Explicit confirmation required to execute undo")

class UndoItemResult(BaseModel):
    op_id: int
    original_path: str
    destination_path: str
    success: bool
    message: str

class UndoApplyResponse(BaseModel):
    batch_id: str
    total_attempted: int
    succeeded: int
    failed: int
    results: List[UndoItemResult]
    timestamp: str

class BatchHistoryItem(BaseModel):
    batch_id: str
    directory_path: str
    timestamp: str
    dry_run: bool
    overwrite_strategy: str
    total_processed: int
    succeeded: int
    skipped: int
    failed: int
    status: str
