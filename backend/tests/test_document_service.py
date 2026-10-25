import io
import pytest
from pypdf import PdfWriter
from backend.app.services.document_service import document_service

def test_extract_txt():
    content = b"Sloth.ai is a privacy-first AI productivity assistant."
    result = document_service.extract_text_from_bytes("test.txt", content)
    assert result.filename == "test.txt"
    assert result.file_type == ".txt"
    assert "privacy-first" in result.text
    assert result.word_count == 7
    assert result.char_count == len(result.text)

def test_extract_markdown():
    content = b"# Sloth Project\n- Item 1\n- Item 2\nDeadline: Oct 2026."
    result = document_service.extract_text_from_bytes("notes.md", content)
    assert result.filename == "notes.md"
    assert result.file_type == ".md"
    assert "# Sloth Project" in result.text
    assert result.word_count > 0

def test_extract_pdf():
    # Generate a valid PDF in memory using pypdf
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    # Write page and verify
    stream = io.BytesIO()
    writer.write(stream)
    pdf_bytes = stream.getvalue()

    result = document_service.extract_text_from_bytes("sample.pdf", pdf_bytes)
    assert result.filename == "sample.pdf"
    assert result.file_type == ".pdf"
    assert result.size_bytes == len(pdf_bytes)

def test_unsupported_file_format():
    with pytest.raises(Exception) as exc_info:
        document_service.extract_text_from_bytes("binary.exe", b"binarydata")
    assert "Unsupported file format" in str(exc_info.value)

def test_empty_file():
    with pytest.raises(Exception) as exc_info:
        document_service.extract_text_from_bytes("empty.txt", b"")
    assert "empty" in str(exc_info.value).lower()

def test_file_size_limit():
    service = document_service
    # Temporarily set max limit low
    original_limit = service.max_size_bytes
    try:
        service.max_size_bytes = 10
        with pytest.raises(Exception) as exc_info:
            service.extract_text_from_bytes("big.txt", b"123456789012345")
        assert "exceeds maximum allowed size" in str(exc_info.value)
    finally:
        service.max_size_bytes = original_limit
