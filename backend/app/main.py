from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List

from .config import settings
from .schemas.health import HealthResponse
from .schemas.ai import AIStatusResponse, AIConfigureRequest, SummarizeRequest, SummarizeResponse
from .schemas.document import DocumentExtractResponse
from .schemas.organizer import (
    ScanDirectoryRequest,
    ScanDirectoryResponse,
    ApplyOperationsRequest,
    ApplyOperationsResponse,
    UndoPreviewRequest,
    UndoPreviewResponse,
    UndoApplyRequest,
    UndoApplyResponse,
    BatchHistoryItem,
)
from .services.ai_service import ai_service
from .services.document_service import document_service
from .services.organizer_service import organizer_service

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Sloth.ai - Local, Privacy-First Productivity Assistant",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "online",
        "description": "Privacy-first local AI productivity assistant",
        "docs_url": "/docs",
    }

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    ai_status = await ai_service.get_status()
    return HealthResponse(
        status="healthy",
        app=settings.app_name,
        version=settings.app_version,
        timestamp=datetime.now().isoformat(),
        details={
            "ollama_available": ai_status.ollama_available,
            "current_model": ai_status.current_model,
            "model_ready": ai_status.model_available,
        },
    )

# --- AI Endpoints ---

@app.get("/api/ai/status", response_model=AIStatusResponse)
async def get_ai_status():
    return await ai_service.get_status()

@app.post("/api/ai/configure", response_model=AIStatusResponse)
async def configure_ai(req: AIConfigureRequest):
    ai_service.configure(model=req.model, host=req.ollama_host)
    return await ai_service.get_status()

@app.post("/api/documents/summarize", response_model=SummarizeResponse)
async def summarize_document(req: SummarizeRequest):
    try:
        return await ai_service.generate_summary(
            text=req.text,
            model=req.model,
            mode=req.mode,
            custom_instructions=req.custom_instructions,
            max_chunk_chars=req.max_chunk_chars,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Document Endpoints ---

@app.post("/api/documents/extract", response_model=DocumentExtractResponse)
async def extract_document(file: UploadFile = File(...)):
    return await document_service.process_upload(file)

# --- Organizer Endpoints ---

@app.post("/api/organizer/scan", response_model=ScanDirectoryResponse)
async def scan_directory(req: ScanDirectoryRequest):
    return organizer_service.scan_directory(req.directory_path, req.use_ai_classification)

@app.post("/api/organizer/apply", response_model=ApplyOperationsResponse)
async def apply_operations(req: ApplyOperationsRequest):
    return organizer_service.apply_operations(req)

@app.get("/api/organizer/history", response_model=List[BatchHistoryItem])
async def get_organizer_history():
    return organizer_service.get_history()

@app.get("/api/organizer/undo/preview", response_model=UndoPreviewResponse)
async def preview_undo_operations_get(batch_id: str = Query(..., description="Batch identifier")):
    return organizer_service.preview_undo(batch_id)

@app.post("/api/organizer/undo/preview", response_model=UndoPreviewResponse)
async def preview_undo_operations(req: UndoPreviewRequest):
    return organizer_service.preview_undo(req.batch_id)

@app.post("/api/organizer/undo/apply", response_model=UndoApplyResponse)
async def apply_undo_operations(req: UndoApplyRequest):
    return organizer_service.apply_undo(req.batch_id, req.confirm)
