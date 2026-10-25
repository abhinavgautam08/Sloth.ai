from pydantic import BaseModel
from typing import List, Optional

class DocumentExtractResponse(BaseModel):
    filename: str
    file_type: str
    size_bytes: int
    char_count: int
    word_count: int
    text: str
    warnings: List[str] = []
