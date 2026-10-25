---
title: "Sloth.ai: The Slow, Steady & Private AI Assistant That Tames Desktop Chaos"
published: false
tags: devchallenge, hf26challenge, opensource, ai
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)*

## What I Built

Sloths move deliberately, conserve energy, and let the world rush around them. In honor of International Sloth Day and the "Slow and Steady" challenge theme, **Sloth.ai** channels that philosophy: a privacy-first, 100% offline desktop productivity assistant that automates the tedious digital chores you keep putting off so you can be productively lazy.

Every day, knowledge workers lose hours to two repetitive cognitive bottlenecks:
1. **Document Overload**: Wading through voluminous meeting notes, RFCs, technical specs, and project briefs just to find the action items or executive takeaways.
2. **Desktop & Downloads Entropy**: Accumulating hundreds of unorganized downloads, screenshots, and data files because dragging and dropping them into folders is tedious and error-prone.

While closed commercial cloud AI tools exist, routing sensitive files through proprietary cloud APIs creates serious trade-offs:
- **Privacy Exposure**: Uploading confidential contracts, personal journals, financial summaries, or internal code to third-party servers.
- **Metered Subscriptions**: Recurring token costs and rate-limits penalizing routine local utility tasks.
- **Internet Dependence**: Total failure when working on trains, flights, or air-gapped workstations.
- **Accidental Data Loss**: Brittle file organization scripts that lack transactional undo history.

**Sloth.ai** solves this by harnessing local open-weight instruction models running directly on your computer via [Ollama](https://ollama.com). It pairs local intelligence with strict safety guarantees:

- 📄 **Document Assistant with Bounded Map-Reduce**: Ingests `.txt`, `.md`, and `.pdf` files in-memory. For long documents exceeding single-shot context windows, it automatically decomposes the text at natural sentence/paragraph boundaries, generates intermediate chunk summaries, and reduces them into high-signal executive briefings, key bullet points, or actionable checklists.
- 🗂️ **Safe File Organizer with SQLite Audit & Rollback**: Declutters messy directories by categorizing loose files into structured folders (`Documents`, `Code_Scripts`, `Images`, `Spreadsheets_Data`, etc.). Includes a dry-run simulation mode, automatic collision renaming (`(1)` suffix), path traversal guards, and a persistent SQLite transaction log (`organizer_history.db`) that enables verified two-step rollback. It refuses to overwrite any newly created files at original locations.
- 🔒 **100% Offline & Private**: Zero external cloud AI requests, zero telemetry, and zero tracking.

---

## Demo & Walkthrough

Sloth.ai runs locally with a modern dark dashboard (`http://localhost:5173`) backed by a high-performance FastAPI service (`http://127.0.0.1:8000`).

### 3-Minute Verification Workflow
1. **Health & Model Readiness**: Launch the app. The header immediately detects your local Ollama instance and active open-weight model (e.g. `codellama:latest` or `llama3.2`) with a green **"100% Local"** badge.
2. **Document Synthesis**:
   - Drag and drop a document (e.g., meeting notes, project brief, or PDF).
   - The in-memory parser extracts character, word, and line counts instantly without storing files on disk.
   - Choose a synthesis mode: *Executive Summary*, *Key Points*, *Action Checklist*, *Dates & Deadlines*, or *Custom Prompt*.
   - Click **Generate Insights**. A real-time progress state informs you that local CPU/GPU synthesis is active. Once generated, inspect the synthesis strategy (`Single-Shot` or `Map-Reduce`) and copy or export Markdown in one click.
3. **Safe File Organization & Dry-Run**:
   - Navigate to **File Organizer** and enter a messy directory (e.g., your `Downloads` or sandbox folder).
   - Click **Scan Directory** to preview proposed folder allocations.
   - Run a **Dry-Run Simulation**: Observe the simulated relocations with zero disk mutations.
4. **Execution & Confirmed Rollback**:
   - Uncheck dry-run, authorize filesystem moves, and execute.
   - Every file move is committed with a unique batch ID in local SQLite storage.
   - Open **Audit History & Undo**, click **Preview Undo** to run preflight validation (confirming destination files exist and original locations are unoccupied), and execute **Confirmed Rollback** to seamlessly restore all files.

---

## Code

- **GitHub Repository**: [https://github.com/abhinavgautam08/Sloth.ai](https://github.com/abhinavgautam08/Sloth.ai)
- **License**: [MIT License](https://opensource.org/licenses/MIT)

---

## How I Built It: Local-First Architecture

Sloth.ai is engineered with a strict separation of concerns, designed for responsiveness, reliability, and security:

```
Sloth.ai Architecture
┌────────────────────────────────────────────────────────┐
│               Frontend: React 19 + Vite                │
│  (Tailwind CSS, Lucide Icons, Real-Time Progress, UI)   │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (HTTP)
┌───────────────────────────▼────────────────────────────┐
│                  Backend: FastAPI                      │
│   ├── Document Service (In-Memory TXT/MD/PDF Parsing)  │
│   ├── AI Service (Bounded Map-Reduce Chunking)         │
│   └── Organizer Service (Path Hardening & Dry-Run)     │
└─────────────┬────────────────────────────┬─────────────┘
              │ Local API (11434)          │ ACID Transactions
┌─────────────▼──────────────┐   ┌─────────▼─────────────┐
│    Ollama Local Runtime    │   │ SQLite Audit Engine   │
│ (Llama 3.2, CodeLlama 7B)  │   │(organizer_history.db) │
└────────────────────────────┘   └───────────────────────┘
```

### 1. Frontend (React 19 & Vite 6)
- **Modern Responsive Design**: Dark theme (`#090a0f`) with amber/gold accents, glassmorphic headers, and accessible typography.
- **State Management**: Reactive status polling for Ollama availability, interactive dry-run diffs, and modal dialogs for safe rollback confirmation.
- **Production Chunking**: Optimized Vite production build (877 kB minified, 231 kB gzipped) with zero console warnings.

### 2. Backend (Python 3.12 & FastAPI)
- **In-Memory Document Extraction**: Extracts raw text from `.txt`, `.md`, and `.pdf` files using `pypdf` with strict size limits (<= 10 MB) and zero disk persistence of user documents.
- **Bounded Map-Reduce Summarization Pipeline**:
  - Automatically triggers when text length exceeds 4,000 characters.
  - Chunks text along sentence and paragraph boundaries (`.\n`, `?\n`, `!\n`, `\n\n`) to preserve context.
  - Bounds total chunks (<= 20) and input size (<= 250,000 chars) to prevent resource exhaustion.
  - Maps intermediate summaries across chunks and performs a final reduction synthesis tailored to the selected mode.
- **Security & Path Hardening**:
  - Resolves canonical absolute paths and strictly prevents directory traversal (`../`).
  - Blocks operations targeting critical system roots (`C:\Windows`, `/`, `/etc`, drive roots).
  - Handles naming collisions gracefully via automatic index numbering (`filename (1).ext`).
- **Persistent SQLite Audit Engine (`history_db.py`)**:
  - Records batch ID, ISO timestamps, source/destination paths, categories, file sizes, and rollback status in an ACID SQLite database (`organizer_history.db`).
  - Validates preflight conditions before reverting moves: refuses to overwrite files if an original path was reoccupied by another file.

---

## Why Does Open Innovation Matter?

Open innovation is what makes Sloth.ai viable. When we depend entirely on centralized cloud AI, we surrender control over our data, our tools, and our costs. Open-weight models shift the paradigm:

1. **Absolute Data Confidentiality**: Medical records, unreleased source code, personal financial spreadsheets, and proprietary strategy briefs never leave your machine.
2. **True Offline Autonomy**: Whether on an airplane, in an air-gapped data facility, or during an ISP outage, Sloth.ai operates at 100% capacity.
3. **Zero Marginal Cost**: After downloading an open-weight model once, generating 10 or 10,000 summaries costs $0.00.
4. **Resilience & Model Choice**: You aren't locked into a single provider's deprecation schedule, pricing surge, or filtering whims. You can switch from `llama3.2` to `codellama`, `mistral`, or `phi3` with a single click.

---

## The Lazy Payoff

By investing in deliberate local automation, Sloth.ai delivers genuine time savings for the productively lazy:

- **15-Page Document Triage in Under 2 Minutes**: Instead of reading a 5,000-word product specification or meeting transcript manually (typically 15–20 minutes of effort), Sloth.ai extracts an actionable checklist and executive summary directly on your machine.
- **Organizing Messy Folders in 2 Seconds**: Sorting a `Downloads` folder of 50+ mixed PDFs, code snippets, CSVs, and images usually takes 5 to 10 minutes of manual dragging. Sloth.ai categorizes the entire folder instantly—and if you change your mind, the SQLite rollback engine restores everything with a single click.

---

## Limitations & Honest Local Assessment

To maintain honesty and technical rigor:
1. **Hardware & Inference Latency**: Open-weight LLMs run on local hardware. On an Apple Silicon Mac or dedicated NVIDIA GPU, generation takes 3–10 seconds. On consumer CPUs without GPU offloading, 7B parameter models (such as `codellama`) can take 60–75 seconds for long documents. We recommend `llama3.2` (3B parameters) for older or CPU-bound laptops.
2. **Scanned Image PDFs vs. Text PDFs**: Sloth.ai uses pure-Python `pypdf` for in-memory extraction. This extracts selectable font text streams with zero external dependencies. However, scanned image-only PDFs (flat raster scans without an embedded OCR layer) require an external OCR engine (like Tesseract), which is not bundled by default to avoid heavy native binary dependencies.
3. **Single Active Model Host**: The application interfaces with local Ollama daemon endpoints (`http://localhost:11434`), requiring Ollama to be installed and running on the host machine.

---

## Setup & How to Run Locally

### Prerequisites
- Python 3.10+ (tested on Python 3.12.10)
- Node.js 18+ (tested on Node v22.23.2 & npm 10.9.8)
- [Ollama](https://ollama.com) installed and running

### 1. Download Open-Weight Model
```bash
# Pull your preferred model (choose one):
ollama run llama3.2    # Lightweight 3B model (recommended for CPU laptops)
ollama run codellama   # 7B model for code & structured analysis
```

### 2. Start Backend
```bash
# In the project root:
python -m venv .venv

# Activate virtual environment:
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies:
pip install -r backend/requirements.txt

# Launch FastAPI backend:
python -m uvicorn backend.app.main:app --port 8000 --host 127.0.0.1
```
The backend starts on `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.

### 3. Start Frontend
```bash
# In a new terminal:
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Verification & Automated Test Results

Every claim in this submission is verified by repeatable automated tests and live integration benchmarks:

- **Backend Pytest Suite**: **31 passed** out of 31 tests (100% pass rate in ~13.7 seconds).
  - `test_ai_service.py` (9 tests): Offline fallback, live synthesis, bounded map-reduce chunking, unicode/whitespace parsing, input ceiling guards, and missing model errors.
  - `test_document_service.py` (6 tests): `.txt`, `.md`, and `.pdf` in-memory extraction, size ceilings, unsupported extensions, and empty file validation.
  - `test_organizer_service.py` (5 tests): Directory scanning, category mapping, dry-run simulation, real moves, collision renaming (`(1)`), and system path traversal prevention.
  - `test_undo_rollback.py` (9 tests): Real moves + rollback, confirmation enforcement, duplicate rollback prevention, occupied destination collision guards, missing file alerts, SQLite persistence across restarts, and batch ID 404 validation.
  - `test_health.py` (2 tests): Health and readiness endpoints.
- **Frontend Build**: `tsc -b && vite build` compiles cleanly with zero TypeScript errors or warnings.
- **Live Local Inference**: Verified live end-to-end against local Ollama running `codellama:latest`.

---

## Prize Categories

- **Primary Entry**: Hacktoberfest 2026 Week 3: "Slow and Steady" Open-Source AI Challenge.
- **Focus**: Pure open-source AI utility, local inference, offline privacy, and safe user-centric automation.
