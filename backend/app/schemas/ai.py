from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ModelInfo(BaseModel):
    name: str
    size: Optional[int] = None
    modified_at: Optional[str] = None
    parameter_size: Optional[str] = None
    family: Optional[str] = None

class AIStatusResponse(BaseModel):
    ollama_available: bool
    ollama_host: str
    current_model: str
    model_available: bool
    available_models: List[str] = []
    models_details: List[ModelInfo] = []
    message: str
    setup_guidance: Optional[str] = None

class AIConfigureRequest(BaseModel):
    model: Optional[str] = None
    ollama_host: Optional[str] = None

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to analyze and summarize")
    model: Optional[str] = Field(None, description="Ollama model to use")
    mode: str = Field("summary", description="Mode: summary, key_points, action_items, dates, custom")
    custom_instructions: Optional[str] = Field(None, description="Custom prompt or guidelines")
    max_chunk_chars: Optional[int] = Field(4000, description="Max characters per chunk for long documents")

class SummarizeResponse(BaseModel):
    summary: str
    key_points: List[str] = []
    action_items: List[str] = []
    dates: List[str] = []
    model_used: str
    processing_time_ms: float
    is_mocked: bool = False
    strategy: str = "single"
    total_chunks: int = 1
    chunks_processed: int = 1
