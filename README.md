# 🦥 Sloth.ai

**Meticulous, Privacy-First Productivity Powered by Local Open-Source AI**

[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-emerald.svg)](#privacy--data-handling)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-blue.svg)](https://fastapi.tiangolo.com)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20Tailwind-purple.svg)](https://vitejs.dev)
[![Tests: 31 Passed](https://img.shields.io/badge/Tests-31%20Passed%20(100%25)-brightgreen.svg)](#6-testing--verification)

Submission for the [Hacktoberfest Open-Source AI Challenge Week 3: “Slow and Steady”](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).

GitHub Repository: [https://github.com/abhinavgautam08/Sloth.ai](https://github.com/abhinavgautam08/Sloth.ai)

---

## 1. Project Purpose & Problem Solved

Every day, developers, researchers, and professionals juggle repetitive desktop chores: reading voluminous memos, summarizing technical documents, extracting action items, and wading through disorganized `Downloads` or `Desktop` folders.

The dominant solution today is routing these documents through commercial cloud AI APIs. However, this introduces substantial drawbacks:
1. **Privacy & Compliance Exposure**: Sending proprietary code, internal strategies, financial statements, or personal journals to remote servers poses severe confidentiality risks.
2. **Subscription & Token Costs**: Recurring costs and token rate-limits penalize routine utility tasks.
3. **Connectivity Dependency**: Cloud assistants fail when traveling, during outages, or in air-gapped environments.
4. **Data Loss from Automation**: Naive organizers and AI tools lack reliable undo transactions, making automatic file moving dangerous.

**Sloth.ai embraces the “Slow and Steady” philosophy:** deliberate, reliable, and completely private open-weight local intelligence. It automates high-frequency chores right on your own machine with safety guarantees, audit history, and zero cloud API leakage.

---

## 2. Features & Capabilities

### A. Document Assistant with Bounded Chunked Summarization
- **Multi-Format Extraction**: Pure-Python in-memory extraction for `.txt`, `.md`, and `.pdf` files up to 10 MB.
- **Bounded Map-Reduce Pipeline for Long Documents**:
  - Automatically activates when document length exceeds model context boundaries (>4,000 chars).
  - Respects sentence and paragraph boundaries (`.\n`, `?\n`, `!\n`, `\n\n`) to prevent chopped sentences.
  - Summarizes intermediate sections individually, then synthesizes a final reduction respecting user mode.
  - Enforces strict input limits (<=250k chars, <=20 chunks) and bounded timeouts to avoid unbounded processing.
- **5 Synthesis Modes**:
  - *Executive Summary*: High-signal overview, key insights, and actionable next steps.
  - *Key Points*: Bulleted digest of critical facts and conclusions.
  - *Action Checklist*: Extract deliverables, assignees, and deadlines into Markdown checklists.
  - *Dates & Deadlines*: Chronological extraction of milestones and schedules.
  - *Custom Prompt*: User-defined instructions executed by the local LLM.
- **Performance & Latency Transparency**: Clearly flags local execution time, processing strategy (`Single-Shot` vs `Map-Reduce`), and notes that local performance depends on local CPU/GPU hardware.

### B. Safe File Organizer with Persistent SQLite Rollback
- **Zero-Loss Guarantee**: Files are NEVER deleted by Sloth.ai.
- **Interactive Move Preview & Dry-Run Mode**: Inspect all proposed relocations with categories, folder destinations, and collision statuses before any disk write.
- **Persistent SQLite Audit Log (`organizer_history.db`)**: Every applied batch and individual file move is recorded with timestamp, source path, destination path, category, file size, and status.
- **Two-Step Safe Undo / Rollback Engine**:
  1. *Undo Preview*: Checks whether the moved file still exists at the destination and verifies that the original location has not been occupied by a new file.
  2. *Refusal to Overwrite on Revert*: Never overwrites an occupied original path. Blocked files are highlighted with clear warnings.
  3. *Explicit Confirmation*: Undo requires user consent (`confirm=True`) to execute.
  4. *Idempotency & Duplicate Prevention*: Batches already rolled back cannot be repeatedly reverted.
- **Security & Path Hardening**:
  - Validates that source and destination paths reside strictly within the allowed target directory tree.
  - Resolves canonical paths and blocks path traversal attempts (`../`).
  - Guards against symlinks targeting outside directories.
  - Blocks operations on system roots (`C:\Windows`, `/`, `/etc`, drive roots).

### C. Open-Weight Model Management & Privacy Verification
- **Dynamic Model Discovery**: Interrogates local Ollama (`http://localhost:11434/api/tags`) to discover installed models (`codellama`, `llama3.2`, `mistral`, `phi3`).
- **100% Offline Capable**: Zero telemetry, zero cloud tracking, zero external network requests.

---

## 3. Architecture & Tech Stack

```
Sloth.ai
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Navigation & live AI health badge
│   │   │   ├── Dashboard.tsx     # Overview, capability cards, quick actions
│   │   │   ├── DocumentAssistant.tsx # Upload, parser, map-reduce LLM view
│   │   │   ├── FileOrganizer.tsx # Path scanner, dry-run, SQLite history & undo UI
│   │   │   └── SettingsView.tsx  # Ollama host, model picker & privacy notes
│   │   ├── api.ts                # Typed client for backend REST API & undo endpoints
│   │   ├── App.tsx               # Root container & view router
│   │   └── main.tsx              # Application entry point
│   └── package.json
│
├── backend/                      # Python 3.12 + FastAPI
│   ├── app/
│   │   ├── main.py               # FastAPI application & route declarations
│   │   ├── config.py             # App settings & environment resolution
│   │   ├── schemas/              # Pydantic schemas (ai, document, organizer, health)
│   │   └── services/
│   │       ├── ai_service.py     # Ollama client, model detection & map-reduce summarizer
│   │       ├── document_service.py # In-memory TXT, MD, PDF extraction & safety guards
│   │       ├── organizer_service.py # Directory scanner, conflict resolver, undo engine
│   │       └── history_db.py     # SQLite audit log with batch & operation tracking
│   ├── tests/                    # Automated pytest suite (31 tests)
│   │   ├── test_ai_service.py    # AI status, map-reduce, unicode, boundary tests
│   │   ├── test_document_service.py # TXT/MD/PDF parsing & limits
│   │   ├── test_health.py        # Health & readiness endpoints
│   │   ├── test_organizer_service.py # Scan, dry-run, apply, conflict rename
│   │   └── test_undo_rollback.py # Rollback, duplicate guards, conflict blocks, persistence
│   └── requirements.txt          # Minimal Python dependencies
│
├── reports/                      # Audit and submission documentation
│   ├── PHASE1_AUDIT_REPORT.md    # Phase 1 verification audit
│   ├── PHASE2_AUDIT_REPORT.md    # Phase 2 comprehensive audit report
│   └── HACKTOBERFEST_DEV_SUBMISSION.md # Official Hacktoberfest DEV post draft
│
├── .gitignore                    # Comprehensive exclusion of venv, dist, db & secrets
├── .env.example                  # Default environment template
└── pytest.ini                    # Test runner configuration
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, version, and local model availability |
| `GET` | `/api/ai/status` | List installed Ollama models and connection state |
| `POST` | `/api/ai/configure` | Dynamically update active model or Ollama host |
| `POST` | `/api/documents/extract` | Upload and extract text from `.txt`, `.md`, or `.pdf` |
| `POST` | `/api/documents/summarize` | Local AI synthesis (Single-Shot or Map-Reduce) |
| `POST` | `/api/organizer/scan` | Scan directory and preview category relocations |
| `POST` | `/api/organizer/apply` | Apply moves to disk or run dry-run simulation |
| `GET` | `/api/organizer/history` | Retrieve persistent SQLite batch operation history |
| `GET/POST`| `/api/organizer/undo/preview` | Inspect undo feasibility, missing files & conflicts |
| `POST` | `/api/organizer/undo/apply` | Execute confirmed file restoration |

---

## 5. Installation & Getting Started

### Prerequisites
- **Python**: Version 3.10+ (tested on Python 3.12.10)
- **Node.js**: Version 18+ (tested on Node v22.23.2 & npm 10.9.8)
- **Ollama**: Installed from [ollama.com](https://ollama.com)

### Step 1: Install Ollama & Pull a Model
1. Install Ollama and start the service:
   ```bash
   ollama serve
   ```
2. Pull your chosen lightweight open-weight model:
   ```bash
   ollama run codellama
   # Or for ultra-low memory systems:
   ollama run llama3.2
   ```

### Step 2: Set Up Backend
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # On Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source .venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Start the FastAPI backend:
   ```bash
   python -m uvicorn backend.app.main:app --port 8000 --host 127.0.0.1
   ```
   The backend API will be available at `http://127.0.0.1:8000` with interactive Swagger docs at `http://127.0.0.1:8000/docs`.

### Step 3: Set Up Frontend
1. In a new terminal, navigate to the `frontend` folder:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your web browser.

---

## 6. Testing & Verification

### Running Backend Automated Tests
All backend features are verified by comprehensive unit and integration tests:

```bash
pytest backend/tests -v
```

**Results:**
- **31 passed**, 1 deprecation warning in 12.52s.
- `test_ai_service.py`: 9 passed (offline status, mocked online, single-shot, empty input, map-reduce chunking, unicode/whitespace handling, input ceiling enforcement, mid-chunk recovery, model missing).
- `test_document_service.py`: 6 passed (TXT, MD, PDF extraction, unsupported formats, empty files, size limit).
- `test_health.py`: 2 passed (root and health check).
- `test_organizer_service.py`: 5 passed (scan, dry-run, real moves, collision renaming, protected path rejections).
- `test_undo_rollback.py`: 9 passed (move + rollback, confirmation requirement, duplicate prevention, occupied conflict blocking, missing file detection, SQLite persistence across restarts, destination path traversal rejection, dry-run exclusion, invalid batch ID 404).

### Running Frontend Production Build Verification
Verify TypeScript compilation and bundle generation:
```bash
cd frontend
npm run build
```
Build outputs cleanly with zero errors.

---

## 7. Concise Walkthrough Demo Script

Follow this step-by-step workflow to demonstrate all core capabilities in under 3 minutes:

### Step 1: Health & Model Readiness
1. Open `http://localhost:5173`.
2. Observe the top navigation bar: the green badge indicates **"codellama:latest (Ready)"** with the **"100% Local"** privacy indicator.
3. Visit the **Settings** view to inspect discovered models (`codellama`, `reon-v14`, or `llama3.2`) and host configuration.

### Step 2: Document Assistant & Synthesis
1. Click on **Document Assistant** in the top navigation.
2. Drag and drop or upload a `.txt`, `.md`, or `.pdf` file (e.g. `organizer_sandbox\Q4_Strategy_Draft.txt`).
3. Inspect the parsed document preview (character count, word count, line count).
4. Select a synthesis mode (e.g., **"Action Checklist"** or **"Executive Summary"**).
5. Click **"Generate Insights"**. Observe the progress state indicating local inference via Ollama.
6. Review the generated insights (with strategy badge `Single Shot` or `Map-Reduce`), and click **"Copy"** or **"Save .md"**.

### Step 3: Safe File Organizer & Dry-Run Simulation
1. Click on **File Organizer** in the top navigation.
2. In the directory input, enter `F:\Hackfest\organizer_sandbox` (or click the quick shortcut button).
3. Click **"Scan Directory"**.
4. Review the category breakdown (`Documents`, `Code & Scripts`, `Images`, `Spreadsheets & Data`).
5. Notice that **"Dry Run (Simulate without touching disk)"** is checked by default.
6. Click **"Run Simulation"**. Inspect the execution outcome showing simulated moves with zero filesystem mutations.

### Step 4: Live Execution & Persistent Undo Rollback
1. Uncheck the "Dry Run" box.
2. Check the safety confirmation box: *"I authorize real filesystem moves"*.
3. Click **"Execute Organization"**. Notice the moves complete and a new batch ID is generated.
4. Click **"Undo This Move"** (or click **"Audit History & Undo"** in the top-right header).
5. In the undo modal, click **"Preview Undo"**.
6. Verify the preflight analysis:
   - Verifies the moved files exist at destination folders.
   - Verifies original locations are not occupied (protecting against accidental data overwrite).
7. Check the confirmation box: *"I confirm that I want to rollback these files to their original directories"*.
8. Click **"Execute Confirmed Rollback"**. Observe the immediate restoration of all files to their original sandbox roots.
9. Verify that clicking undo again is safely blocked with a duplicate prevention warning.

---

## 8. Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| **"Ollama Offline" badge in red** | Ollama background service is not running or blocked by firewall. | Run `ollama serve` in a terminal or launch the Ollama desktop tray application. Check that `http://localhost:11434` responds. |
| **"Model not found in local Ollama library"** | Target model has not been downloaded yet. | Run `ollama run codellama` (or `ollama pull llama3.2`) in your terminal to download the open-weight model to disk. |
| **Port 8000 already in use** | Another local service or previous uvicorn instance is active. | Start backend on an alternate port: `python -m uvicorn backend.app.main:app --port 8001` and update proxy/settings. |
| **Scanned PDF yields empty text** | Document consists only of flat raster scans without a font text stream. | Scanned image-only PDFs require an OCR text layer. Use an OCR tool or native PDF with embedded selectable text. |
| **Long inference duration on CPU** | 7B parameter models require CPU cycles when dedicated GPU acceleration is unavailable. | For low-spec laptops, use a smaller 3B model: `ollama run llama3.2` for 3x faster local CPU inference. |

---

## 9. Local OCR Assessment (Scanned PDFs)

In accordance with Phase 2 safety and reliability priorities:
- **Current Support**: Embedded text streams inside native PDF files are extracted directly and efficiently via pure-Python extraction (`pypdf`).
- **Scanned Image PDFs**: Scanned documents containing only raster images (without a text layer) currently return an informative warning advising the user that OCR is required.
- **Why Scanned PDF OCR is Not Bundled by Default**:
  1. Optical Character Recognition requires external native binary tools (e.g. `tesseract-ocr` or ONNX OCR models) not included in the standard Python distribution.
  2. Installing Tesseract requires system-level binary installation (`apt install tesseract-ocr`, `brew install tesseract`, or Windows installer) and language training data packs (`eng.traineddata`).
  3. Bundling heavy native libraries without verified system packages creates cross-platform installation failures for beginner users.
- **Proposed Phase 3 Local OCR Plan**:
  - Integrate an optional local OCR pipeline utilizing `pytesseract` or a lightweight local vision model (`llava-phi3` or `moondream2` via Ollama) to maintain 100% local processing without leaking scanned documents to cloud vision APIs.

---

## 10. Privacy & Data Handling

1. **Strictly Local Processing**: Document contents are read and processed entirely in local computer memory.
2. **Zero Cloud AI Leakage**: Document text is never routed to OpenAI, Anthropic, or external telemetry services.
3. **No Unsolicited Network Calls**: The backend makes network requests strictly to the configured local Ollama endpoint (`http://localhost:11434`).
4. **Offline Readiness**: Once an open-weight model is pulled to your disk, the complete pipeline functions 100% offline.
5. **Safe File Handling**: File operations require explicit user confirmation, operate non-destructively by default, and reject sensitive system directories.
6. **Rollback Safety**: Reverting file operations refuses to overwrite any newly created files at original paths.

---

## 11. License

This project is licensed under the [MIT License](LICENSE).
Open-weight models accessed through Ollama operate under their respective community licenses (Llama 3.2 Community License, Apache 2.0, or MIT).
