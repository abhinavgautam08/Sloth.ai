import io
import os
from typing import Tuple, List
from fastapi import UploadFile, HTTPException
from pypdf import PdfReader
from ..config import settings
from ..schemas.document import DocumentExtractResponse

class DocumentService:
    def __init__(self, max_size_bytes: int = settings.max_upload_size_bytes):
        self.max_size_bytes = max_size_bytes
        self.allowed_extensions = settings.allowed_extensions

    def validate_file(self, filename: str, file_size: int):
        ext = os.path.splitext(filename)[1].lower()
        if ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Supported formats: {', '.join(self.allowed_extensions)}",
            )
        if file_size > self.max_size_bytes:
            mb_limit = self.max_size_bytes / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {mb_limit:.1f} MB.",
            )

    def extract_text_from_bytes(self, filename: str, content: bytes) -> DocumentExtractResponse:
        self.validate_file(filename, len(content))
        ext = os.path.splitext(filename)[1].lower()
        warnings: List[str] = []

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty (0 bytes).")

        extracted_text = ""

        if ext in [".txt", ".md"]:
            try:
                extracted_text = content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    extracted_text = content.decode("latin-1")
                    warnings.append("Document was decoded using fallback latin-1 encoding.")
                except Exception as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to decode text file: {str(e)}",
                    )
        elif ext == ".pdf":
            try:
                pdf_file = io.BytesIO(content)
                reader = PdfReader(pdf_file)
                if reader.is_encrypted:
                    try:
                        reader.decrypt("")
                    except Exception:
                        raise HTTPException(
                            status_code=400,
                            detail="Password-protected / encrypted PDFs are not supported in local processing.",
                        )
                
                num_pages = len(reader.pages)
                if num_pages == 0:
                    raise HTTPException(status_code=400, detail="PDF contains 0 pages.")

                page_texts = []
                for i, page in enumerate(reader.pages):
                    page_str = page.extract_text() or ""
                    if page_str.strip():
                        page_texts.append(page_str)
                
                if not page_texts:
                    warnings.append(
                        "PDF appears to contain only scanned images or non-extractable text without an OCR layer."
                    )
                    extracted_text = ""
                else:
                    extracted_text = "\n\n".join(page_texts)

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Malformed or corrupt PDF document: {str(e)}",
                )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'.")

        cleaned_text = extracted_text.strip()
        if not cleaned_text and not warnings:
            raise HTTPException(status_code=400, detail="No readable text could be extracted from this document.")

        char_count = len(cleaned_text)
        word_count = len(cleaned_text.split()) if cleaned_text else 0

        return DocumentExtractResponse(
            filename=filename,
            file_type=ext,
            size_bytes=len(content),
            char_count=char_count,
            word_count=word_count,
            text=cleaned_text,
            warnings=warnings,
        )

    async def process_upload(self, file: UploadFile) -> DocumentExtractResponse:
        content = await file.read()
        return self.extract_text_from_bytes(file.filename or "unknown", content)

document_service = DocumentService()
