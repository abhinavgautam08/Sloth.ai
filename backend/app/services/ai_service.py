import time
import httpx
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from ..config import settings
from ..schemas.ai import AIStatusResponse, ModelInfo, SummarizeResponse

MAX_DOCUMENT_CHARS = 250_000
MAX_CHUNKS_ALLOWED = 20
DEFAULT_CHUNK_SIZE = 4000

class AIService:
    def __init__(self, host: Optional[str] = None, default_model: Optional[str] = None):
        self.host = (host or settings.ollama_host).rstrip("/")
        self.configured_model = default_model or settings.default_model

    async def get_status(self) -> AIStatusResponse:
        """
        Check Ollama availability, discover installed models, and verify
        if configured model is ready.
        """
        url = f"{self.host}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    models = data.get("models", [])
                    available_model_names = [m.get("name", "") for m in models]
                    
                    models_details = []
                    for m in models:
                        details = m.get("details", {}) or {}
                        models_details.append(
                            ModelInfo(
                                name=m.get("name", ""),
                                size=m.get("size"),
                                modified_at=m.get("modified_at"),
                                parameter_size=details.get("parameter_size"),
                                family=details.get("family"),
                            )
                        )
                    
                    # Auto-fallback to first available model if current model isn't downloaded yet
                    model_available = any(
                        self.configured_model in name or name in self.configured_model
                        for name in available_model_names
                    )
                    
                    if not model_available and available_model_names:
                        active_model = available_model_names[0]
                    else:
                        active_model = self.configured_model

                    if not available_model_names:
                        message = "Ollama is running, but no models are downloaded yet."
                        setup_guidance = (
                            f"Run `ollama run {self.configured_model}` in your terminal. "
                            "Initial download requires internet access; subsequent inference runs fully offline."
                        )
                    elif not model_available:
                        message = f"Configured model '{self.configured_model}' not found. Found {len(available_model_names)} other model(s)."
                        setup_guidance = (
                            f"Run `ollama pull {self.configured_model}` or select an available model from the dropdown: "
                            f"{', '.join(available_model_names)}"
                        )
                    else:
                        message = f"Local AI is active and ready with model '{active_model}'."
                        setup_guidance = None

                    return AIStatusResponse(
                        ollama_available=True,
                        ollama_host=self.host,
                        current_model=active_model,
                        model_available=model_available or len(available_model_names) > 0,
                        available_models=available_model_names,
                        models_details=models_details,
                        message=message,
                        setup_guidance=setup_guidance,
                    )
                else:
                    return AIStatusResponse(
                        ollama_available=False,
                        ollama_host=self.host,
                        current_model=self.configured_model,
                        model_available=False,
                        message=f"Ollama returned unexpected HTTP {res.status_code}.",
                        setup_guidance="Verify your Ollama instance at " + self.host,
                    )
        except httpx.ConnectError:
            return AIStatusResponse(
                ollama_available=False,
                ollama_host=self.host,
                current_model=self.configured_model,
                model_available=False,
                available_models=[],
                message="Cannot connect to local Ollama runtime.",
                setup_guidance=(
                    "1. Install Ollama from https://ollama.com\n"
                    "2. Start Ollama with `ollama serve` (or launch the Ollama desktop app)\n"
                    f"3. Pull a lightweight model: `ollama run {self.configured_model}`"
                ),
            )
        except Exception as e:
            return AIStatusResponse(
                ollama_available=False,
                ollama_host=self.host,
                current_model=self.configured_model,
                model_available=False,
                available_models=[],
                message=f"Ollama status check failed: {str(e)}",
                setup_guidance="Check local service health.",
            )

    def configure(self, model: Optional[str] = None, host: Optional[str] = None):
        if model:
            self.configured_model = model
        if host:
            self.host = host.rstrip("/")

    def _chunk_text(self, text: str, chunk_size: int = DEFAULT_CHUNK_SIZE) -> List[str]:
        """
        Split long text into coherent segments respecting paragraph and sentence boundaries.
        Guarantees no portions of the document are silently dropped.
        """
        if len(text) > MAX_DOCUMENT_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"Document text length ({len(text):,} chars) exceeds safety limit of {MAX_DOCUMENT_CHARS:,} chars.",
            )

        if len(text) <= chunk_size:
            return [text]

        chunks: List[str] = []
        paragraphs = text.split("\n\n")
        current_chunk = ""

        for p in paragraphs:
            p_clean = p.strip()
            if not p_clean:
                continue

            # If a single paragraph is larger than chunk_size, split by sentences
            if len(p_clean) > chunk_size:
                sentences = p_clean.replace("! ", ". ").replace("? ", ". ").split(". ")
                for s in sentences:
                    s_clean = s.strip()
                    if not s_clean:
                        continue
                    if len(current_chunk) + len(s_clean) + 2 > chunk_size and current_chunk:
                        chunks.append(current_chunk.strip())
                        current_chunk = s_clean + ". "
                    else:
                        current_chunk += s_clean + ". "
            else:
                if len(current_chunk) + len(p_clean) + 2 > chunk_size and current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = p_clean + "\n\n"
                else:
                    current_chunk += p_clean + "\n\n"

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        if len(chunks) > MAX_CHUNKS_ALLOWED:
            raise HTTPException(
                status_code=400,
                detail=f"Document produced {len(chunks)} chunks, exceeding the local processing safety limit of {MAX_CHUNKS_ALLOWED} chunks.",
            )

        return chunks

    def _build_prompt(self, text: str, mode: str, custom_instructions: Optional[str] = None) -> str:
        base_instruction = (
            "You are Sloth.ai, a privacy-first, meticulous local AI assistant. "
            "Analyze the provided document text accurately. Never fabricate details not present in the text.\n\n"
        )
        if mode == "summary":
            mode_prompt = (
                "Provide an executive summary of the document. "
                "Structure your response with:\n"
                "- **Overview**: 2-3 sentences summarizing the core topic.\n"
                "- **Key Insights**: Bullet points of key conclusions or facts.\n"
                "- **Actionable Next Steps**: Any follow-up items mentioned.\n"
            )
        elif mode == "key_points":
            mode_prompt = (
                "Extract the most critical key points and takeaways from the document as a concise bulleted list. "
                "Focus on actionable facts, decisions, and metrics."
            )
        elif mode == "action_items":
            mode_prompt = (
                "Extract all explicit and implicit action items, deliverables, assignees, and deadlines mentioned in the document. "
                "Format as a markdown checklist: '- [ ] [Assignee/Task]: Description (Deadline: date if specified)'."
            )
        elif mode == "dates":
            mode_prompt = (
                "Extract all dates, milestones, deadlines, and timeframes mentioned in the document. "
                "Format chronologically or clearly mapped to their associated event/task."
            )
        elif mode == "custom":
            mode_prompt = f"Follow these custom user instructions carefully:\n{custom_instructions or 'Summarize the document.'}\n"
        else:
            mode_prompt = "Provide a clear, concise summary of the document."

        full_prompt = (
            f"{base_instruction}"
            f"TASK:\n{mode_prompt}\n\n"
            f"DOCUMENT CONTENT:\n\"\"\"\n{text}\n\"\"\"\n\n"
            "RESPONSE:"
        )
        return full_prompt

    async def _execute_ollama_call(
        self,
        client: httpx.AsyncClient,
        target_model: str,
        prompt: str,
        timeout: float,
    ) -> str:
        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
            },
        }
        res = await client.post(f"{self.host}/api/generate", json=payload)
        if res.status_code == 200:
            data = res.json()
            return data.get("response", "").strip()
        elif res.status_code == 404:
            raise RuntimeError(
                f"Model '{target_model}' not found in local Ollama library. "
                f"Run `ollama run {target_model}` to pull it."
            )
        else:
            raise RuntimeError(f"Ollama generation failed with status {res.status_code}: {res.text}")

    async def generate_summary(
        self,
        text: str,
        model: Optional[str] = None,
        mode: str = "summary",
        custom_instructions: Optional[str] = None,
        timeout: float = 180.0,
        max_chunk_chars: Optional[int] = DEFAULT_CHUNK_SIZE,
    ) -> SummarizeResponse:
        clean_text = text.strip()
        if not clean_text:
            raise HTTPException(status_code=400, detail="Cannot summarize empty document content.")

        start_time = time.perf_counter()
        target_model = model or self.configured_model
        chunk_threshold = max_chunk_chars or DEFAULT_CHUNK_SIZE

        # Determine strategy: single-shot vs chunked map-reduce
        chunks = self._chunk_text(clean_text, chunk_size=chunk_threshold)
        strategy = "single" if len(chunks) == 1 else "chunked_map_reduce"

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if strategy == "single":
                    prompt = self._build_prompt(chunks[0], mode, custom_instructions)
                    final_text = await self._execute_ollama_call(client, target_model, prompt, timeout)
                    chunks_processed = 1
                else:
                    # Map phase: process each chunk with intermediate summarization
                    intermediate_summaries = []
                    for idx, chunk in enumerate(chunks):
                        map_prompt = (
                            f"You are Sloth.ai. Analyze section {idx + 1} of {len(chunks)} of a comprehensive document. "
                            "Extract the core facts, technical points, and any mentioned tasks or dates concisely:\n\n"
                            f"\"\"\"\n{chunk}\n\"\"\"\n\nSECTION SUMMARY:"
                        )
                        chunk_summary = await self._execute_ollama_call(client, target_model, map_prompt, timeout)
                        intermediate_summaries.append(f"### Section {idx + 1}\n{chunk_summary}")

                    # Reduce phase: synthesize all intermediate summaries according to user's requested mode
                    combined_intermediate = "\n\n".join(intermediate_summaries)
                    reduce_prompt = self._build_prompt(
                        f"SYNTHESIZED SECTION EXTRACTS:\n\n{combined_intermediate}",
                        mode,
                        custom_instructions,
                    )
                    final_text = await self._execute_ollama_call(client, target_model, reduce_prompt, timeout)
                    chunks_processed = len(chunks)

                elapsed = (time.perf_counter() - start_time) * 1000

                # Parse structured highlights
                key_points = []
                action_items = []
                dates = []
                for line in final_text.splitlines():
                    s = line.strip()
                    if s.startswith("- [ ]") or s.startswith("* [ ]") or s.lower().startswith("action:"):
                        action_items.append(s)
                    elif s.startswith("- ") or s.startswith("* ") or (len(s) > 2 and s[0].isdigit() and s[1] in (".", ")")):
                        key_points.append(s)
                    if any(year in s for year in ["2024", "2025", "2026", "2027"]) or any(month in s.lower() for month in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]):
                        dates.append(s)

                return SummarizeResponse(
                    summary=final_text,
                    key_points=key_points[:15],
                    action_items=action_items[:15],
                    dates=dates[:15],
                    model_used=target_model,
                    processing_time_ms=round(elapsed, 2),
                    is_mocked=False,
                    strategy=strategy,
                    total_chunks=len(chunks),
                    chunks_processed=chunks_processed,
                )

        except HTTPException:
            raise
        except httpx.ConnectError:
            raise RuntimeError(
                f"Cannot connect to Ollama at {self.host}. Please ensure Ollama is running (`ollama serve`)."
            )
        except httpx.TimeoutException:
            raise RuntimeError(
                f"Inference timed out after {timeout} seconds during {strategy} processing. "
                "Consider selecting a lighter model (e.g. `llama3.2`) or reducing document size."
            )

ai_service = AIService()
