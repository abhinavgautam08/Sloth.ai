import pytest
from unittest.mock import patch, AsyncMock
import httpx
from fastapi import HTTPException
from backend.app.services.ai_service import AIService

@pytest.mark.asyncio
async def test_ai_status_when_ollama_offline():
    service = AIService(host="http://localhost:99999", default_model="llama3.2")
    status = await service.get_status()
    assert status.ollama_available is False
    assert status.model_available is False
    assert "Cannot connect" in status.message or "failed" in status.message
    assert status.setup_guidance is not None

@pytest.mark.asyncio
async def test_ai_status_when_ollama_online_mocked():
    service = AIService(host="http://localhost:11434", default_model="llama3.2")
    mock_response = httpx.Response(
        200,
        json={
            "models": [
                {
                    "name": "llama3.2:latest",
                    "size": 2000000000,
                    "details": {"parameter_size": "3B", "family": "llama"}
                }
            ]
        },
        request=httpx.Request("GET", "http://localhost:11434/api/tags"),
    )
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        status = await service.get_status()
        assert status.ollama_available is True
        assert status.model_available is True
        assert "llama3.2:latest" in status.available_models

@pytest.mark.asyncio
async def test_summarize_mocked_success():
    service = AIService(host="http://localhost:11434", default_model="llama3.2")
    mock_payload = {
        "response": (
            "## Summary\n"
            "This document outlines the Q4 roadmap.\n"
            "- Key point: delivery by Dec 2026.\n"
            "- [ ] Prepare release notes\n"
        )
    }
    mock_response = httpx.Response(
        200,
        json=mock_payload,
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        res = await service.generate_summary("Some sample text for summarization.")
        assert "This document outlines the Q4 roadmap" in res.summary
        assert len(res.action_items) >= 1
        assert res.model_used == "llama3.2"
        assert res.strategy == "single"
        assert res.total_chunks == 1
        assert res.is_mocked is False

@pytest.mark.asyncio
async def test_summarize_empty_document_raises_400():
    service = AIService()
    with pytest.raises(HTTPException) as exc_info:
        await service.generate_summary("   \n\t   ")
    assert exc_info.value.status_code == 400
    assert "empty" in str(exc_info.value.detail).lower()

@pytest.mark.asyncio
async def test_summarize_chunked_map_reduce_mocked():
    service = AIService(host="http://localhost:11434", default_model="llama3.2")
    
    # Create text that exceeds chunk threshold (e.g. 300 chars with chunk_size=100)
    paragraph1 = "Section 1 covers authentication protocols and data privacy guidelines for users.\n\n"
    paragraph2 = "Section 2 describes filesystem safeguards, rollback logs, and safe file movers.\n\n"
    paragraph3 = "Section 3 outlines the roadmap for Q4 2026 including milestone deadlines.\n\n"
    long_text = paragraph1 + paragraph2 + paragraph3

    # Mock responses for map phase (3 calls) and reduce phase (1 call)
    mock_response = httpx.Response(
        200,
        json={"response": "## Intermediate summary\n- Core takeaway fact.\n- [ ] Action item."},
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response) as mock_post:
        res = await service.generate_summary(long_text, max_chunk_chars=100)
        assert res.strategy == "chunked_map_reduce"
        assert res.total_chunks >= 2
        assert res.chunks_processed == res.total_chunks
        # Expect 3 map calls + 1 reduce call = 4 calls total
        assert mock_post.call_count >= 3

@pytest.mark.asyncio
async def test_summarize_unicode_and_whitespace():
    service = AIService(host="http://localhost:11434", default_model="llama3.2")
    unicode_text = "Sloth.ai handles multi-lingual text: 🦥 惰性, 怠惰, Paresseux. Special symbols: © ® ™ € £ ¥."
    mock_response = httpx.Response(
        200,
        json={"response": "Summary with Unicode characters intact."},
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        res = await service.generate_summary(unicode_text)
        assert res.summary == "Summary with Unicode characters intact."

@pytest.mark.asyncio
async def test_summarize_document_too_large_raises_400():
    service = AIService()
    oversized_text = "a" * 260_000
    with pytest.raises(HTTPException) as exc_info:
        await service.generate_summary(oversized_text)
    assert exc_info.value.status_code == 400
    assert "exceeds safety limit" in str(exc_info.value.detail).lower()

@pytest.mark.asyncio
async def test_summarize_mid_chunk_failure():
    service = AIService(host="http://localhost:11434", default_model="llama3.2")
    long_text = "Paragraph 1 is here.\n\nParagraph 2 is here."
    
    # Simulate network failure during chunk processing
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection broke")):
        with pytest.raises(RuntimeError) as exc_info:
            await service.generate_summary(long_text, max_chunk_chars=20)
        assert "Cannot connect" in str(exc_info.value)

@pytest.mark.asyncio
async def test_summarize_model_not_found():
    service = AIService(host="http://localhost:11434", default_model="non_existent_model")
    mock_response = httpx.Response(
        404,
        text="model not found",
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        with pytest.raises(RuntimeError) as exc_info:
            await service.generate_summary("Some text", model="non_existent_model")
        assert "not found" in str(exc_info.value)
