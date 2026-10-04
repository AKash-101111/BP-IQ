# BlueprintIQ

> **UNCERTAINTY-AWARE BLUEPRINT-TO-BOQ INTELLIGENCE**

BlueprintIQ is a professional construction intelligence workbench that ingests real architectural drawings (PDF, PNG, JPG, scanned plans), extracts spatial geometry, performs deterministic Bill of Quantities (BOQ) calculations, detects dimensional & compliance conflicts, cross-references findings with building standards (NBC 2016, IS 456, IS 1200, IBC), synthesizes explanations via a locally-hosted Gemma 2B model via Ollama, and renders an interactive marked-up blueprint canvas with precision bounding boxes and numbered callouts.

---

## Core Philosophy: "No Faked Certainty"

1. **Deterministic Engineering Math**: Material volumes, concrete mix proportions (M15, M20, M25), mortar factors (1.33 dry factor), modular brick counts (500 bricks/m³ to IS 2212), and steel reinforcement thumb rules are strictly calculated by deterministic algorithms—never hallucinated by an LLM.
2. **Local AI Reasoning (Gemma 2B via Ollama)**: The local Gemma 2B model at `http://localhost:11434` is used for qualitative reasoning, synthesizing RAG evidence, explaining anomalies, and formulating professional recommendations in structured JSON format.
3. **Construction Standards RAG**: Retrieval Augmented Generation layer seeded with real, verified engineering codes:
   - **NBC 2016 Part 3**: Minimum habitable room areas (≥ 9.5 m² / 102 sq.ft), minimum room width (≥ 2.4 m), ceiling heights, and staircase flight widths (≥ 1.0 m).
   - **IS 456:2000**: Plain and reinforced concrete mix design, dry volume factors (1.54), cement content, and steel reinforcement ratios.
   - **IS 1200**: Standard civil measurement deduction rules for openings in masonry and plaster.
   - **IBC 2021**: Stair riser/tread geometry (riser ≤ 190 mm, tread ≥ 250 mm) and door egress clearances.
4. **Visual Issue Marking**: Anomalies are visually marked on the blueprint drawing with high-contrast bounding boxes, translucent fills, numbered badges (`[01]`, `[02]`), and a legend box. Clicking any issue in the workbench automatically zooms and centers the canvas on that issue.
5. **Dual-Mode Persistence (Supabase + Local Resilient Store)**: 100% Supabase-ready (PostgreSQL, pgvector, Supabase Storage) with an automated local JSON/filesystem fallback for immediate zero-configuration local execution.

---

## 12-Stage Intelligence Pipeline

```
USER INPUT METADATA
       ↓
BLUEPRINT UPLOAD (PDF / PNG / JPG)
       ↓
FILE VALIDATION & DPI CHECK (150-300 DPI)
       ↓
PYMUPDF / OPENCV IMAGE PREPROCESSING
       ↓
OCR & TEXT BOUNDARY EXTRACTION
       ↓
GEOMETRIC CONTOUR & WALL SEGMENTATION
       ↓
DIMENSION CALLOUT PARSING & SCALE CALIBRATION
       ↓
DETERMINISTIC QUANTITY ESTIMATION (BOQ)
       ↓
BLUEPRINT ISSUE DETECTION ENGINE
       ↓
RAG CONSTRUCTION STANDARDS VERIFICATION
       ↓
LOCAL GEMMA 2B REASONING (Ollama localhost:11434)
       ↓
VISUAL MARKED-UP BLUEPRINT GENERATION
       ↓
CERTIFIED PDF REPORT & EXPORT
```

---

## Project Structure

```
BP-IQ/
├── backend/
│   ├── app/
│   │   ├── config.py              # Configuration & storage paths
│   │   ├── main.py                # FastAPI app entrypoint
│   │   ├── init_db.py             # Database seed & sample project setup
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic data schemas
│   │   ├── routers/
│   │   │   ├── projects.py        # Project CRUD & metadata
│   │   │   ├── blueprints.py      # Upload & page extraction
│   │   │   ├── analysis.py        # 12-stage pipeline execution
│   │   │   ├── rag.py             # Knowledge base search
│   │   │   └── system.py          # Ollama & database health checks
│   │   └── services/
│   │       ├── db.py              # Supabase + local store fallback
│   │       ├── storage.py         # Supabase Storage + filesystem fallback
│   │       ├── blueprint_cv.py    # PyMuPDF & OpenCV CV engine
│   │       ├── boq_engine.py      # Deterministic civil formulas
│   │       ├── issue_detector.py  # Anomaly & dimension consistency checks
│   │       ├── rag_engine.py      # Indexed NBC / IS / IBC standards
│   │       ├── ollama_client.py   # Gemma 2B structured JSON client
│   │       ├── uncertainty_engine.py # Uncertainty quantification
│   │       ├── markup_generator.py   # Visual marked-up blueprint generator
│   │       └── report_generator.py   # PDF report generator (ReportLab)
│   ├── sample_blueprints/
│   │   └── sample_residential_blueprint.pdf # Authentic vector drawing
│   ├── storage/                   # Local binary files, pages, reports
│   ├── tests/
│   │   └── test_backend.py        # Pytest test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, Header
│   │   │   ├── viewer/            # Interactive BlueprintViewer (Canvas/SVG)
│   │   │   ├── inspector/         # Overview, Measurements, BOQ, Issues, Evidence, Assumptions
│   │   │   ├── wizard/            # 10-Step Project Wizard Modal
│   │   │   └── views/             # Dashboard, KnowledgeBase, Reports
│   │   ├── api.ts                 # Backend API client
│   │   ├── types.ts               # TypeScript interface definitions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── supabase/
│   ├── migrations/
│   │   └── 20261001_initial_schema.sql # PostgreSQL + pgvector schema
│   └── seed_knowledge.sql         # Verified engineering standards SQL
├── .env.example
└── README.md
```

---

## Setup & Installation

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **Ollama** installed with `gemma:2b`:
  ```bash
  ollama pull gemma:2b
  ```

### 2. Backend Setup
```bash
# In project root:
py -3.11 -m venv venv
.\venv\Scripts\pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r backend\requirements.txt

# Run initial authentic project seed:
.\venv\Scripts\python -m backend.app.init_db

# Start FastAPI backend (port 8000):
.\venv\Scripts\uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup
```bash
# In frontend directory:
cd frontend
npm install
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

---

## Verification & Testing

To run the automated backend test suite:
```bash
.\venv\Scripts\python -m pytest backend\tests
```
Tests verify:
- RAG semantic keyword search and clause retrieval
- Deterministic civil engineering formulas (cement bags, sand, masonry volume, plaster deductions, steel tonnage)
- Dimension discrepancy detection and minimum habitable space audits
- PyMuPDF vector drawing parsing and OpenCV contour segmentation

To verify the frontend TypeScript and production bundle:
```bash
cd frontend
npm run build
```

---

## Statutory Safety Notice

> **BlueprintIQ provides preliminary automated computer-vision analysis and quantity estimates. It does not replace a licensed architect, structural engineer, quantity surveyor, or local municipal authority approval. All quantities and dimensional clearances must be professionally verified prior to procurement or construction.**
