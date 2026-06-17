# ZANA — Build Progress Tracker

> **Single source of truth for build progress.** Update checkboxes as work completes. Update the "Current State" section at the top after each phase.

---

## Current State

- **Current phase:** Phase 12 — Polish, Docker, Demo Prep (done)
- **Last completed phase:** Phase 12
- **Branch:** `main`
- **Blockers:** None. After cloning, fill `backend/.env`, then `docker compose up --build` plus a one-time `scripts.seed` + `scripts.index_catalogue` populates SQLite and Chroma.
- **Notes:** SQLite populated with 10 services; Chroma at `backend/chroma_data/` once indexed. Backend tests stub external SDKs; frontend `next build` is clean.

---

## Phase Status Summary

| Phase | Title                                  | Status      | Commit |
| ----- | -------------------------------------- | ----------- | ------ |
| 1     | Setup & Foundation                     | Done        | `37d5c56` |
| 2     | Database & Service Catalogue           | Done        | `3ff06b1` |
| 3     | RAG Pipeline                           | Done        | `bb187a6` |
| 4     | LLM Integration & System Prompts       | Done        | `c810f1f` |
| 5     | Backend: Citizen Endpoints             | Done        | `7627142` |
| 6     | Backend: Agent Co-Pilot Endpoints      | Done        | `968acd6` |
| 7     | Backend: Admin Endpoints + Auth        | Done        | `e413b2b` |
| 8     | Frontend: Setup                        | Done        | `5bd1d55` |
| 9     | Frontend: Citizen UI                   | Done        | `9ebd038` |
| 10    | Frontend: Agent Co-Pilot UI            | Done        | `d21e917` |
| 11    | Frontend: Admin UI                     | Done        | `af98dac` |
| 12    | Polish, Docker, Demo Prep              | Done        | (this commit) |

Statuses: `Not started` · `In progress` · `Blocked` · `Done`

---

## PHASE 1 — Setup & Foundation ✅

- [x] Initialize git repo on `main` branch (pre-existing)
- [x] Create directory structure (`backend/app/{catalogue,rag,llm/prompts,ingestion,routers,voice,middleware,db}`, `backend/{data,scripts,tests}`, `frontend`)
- [x] Create `backend/requirements.txt` with pinned versions (added `pydantic-settings`, `pytest`, `pytest-asyncio`)
- [x] Create `backend/.env.example`
- [x] Create `backend/.gitignore` (`.env`, `chroma_data/`, `*.db`, `__pycache__/`, `node_modules/`, `.next/`, `.venv/`)
- [x] Update root `README.md` (done earlier in tracking-doc step)
- [x] Create `backend/app/__init__.py` (+ subpackage `__init__.py` files)
- [x] Create `backend/app/config.py` (pydantic-settings)
- [x] Create `backend/app/main.py` (FastAPI app, CORS, `GET /health`)
- [x] Verify `uvicorn app.main:app` boots and `/health` returns `{"status":"ok",...}` ✓

**Commit:** `chore: initial project structure and dependencies`

---

## PHASE 2 — Database & Service Catalogue ✅

- [x] `backend/app/db/database.py` — SQLAlchemy engine + session + `init_db()`
- [x] `backend/app/catalogue/models.py` — all 7 tables
  - [x] `Service`
  - [x] `ServiceStep`
  - [x] `ServiceFAQ`
  - [x] `ResponseTemplate`
  - [x] `Document`
  - [x] `Source`
  - [x] `QueryLog`
- [x] `backend/app/catalogue/crud.py` — full CRUD (incl. `upsert_service`, `serialize_service`, `top_queries`)
- [x] `backend/data/seed_services.json` — 10 services fully populated multilingual
  - [x] pasaporta
  - [x] letërnjoftim
  - [x] çertifikatë lindjeje
  - [x] çertifikatë martese
  - [x] çertifikatë vdekjeje
  - [x] regjistrim biznesi (ARBK)
  - [x] patentë shoferi
  - [x] ekstrakt amze
  - [x] çertifikatë gjendjes martesore
  - [x] leje qëndrimi për të huaj
- [x] `backend/scripts/seed.py` — populate SQLite from JSON (idempotent)
- [x] Verify 10 services in DB ✓

**Commit:** `feat(catalogue): database models + 10 seed services with multilingual data`

---

## PHASE 3 — RAG Pipeline ⚠️ (code complete, live verification pending)

- [x] `backend/app/rag/chunker.py` — `chunk_text(text, 700, 100)`
- [x] `backend/app/rag/embedder.py` — OpenAI `text-embedding-3-small`, batched (≤100 per call)
- [x] `backend/app/rag/vectorstore.py` — ChromaDB wrapper, collection `"zana"`, upsert-by-id
- [x] `backend/app/rag/retriever.py` — `retrieve(query, top_k, where)` returns `Chunk` dataclass
- [x] `backend/app/rag/search.py` — `smart_search(db, query, language)` hybrid keyword+semantic
- [x] `backend/scripts/index_catalogue.py` — chunks per (type, language), stable IDs, idempotent upsert
- [ ] **Run indexer**; verify Chroma populated — *pending OpenAI key*
- [x] `backend/tests/test_rag.py` — chunker unit tests pass; live retrieval test auto-skips when key absent

**Commit:** `feat(rag): chunker, embedder, ChromaDB vectorstore, retriever, catalogue indexing`

> To finish verification later: put `OPENAI_API_KEY` in `backend/.env`, then run
> `python -m scripts.index_catalogue && pytest tests/test_rag.py` from `backend/`.

---

## PHASE 4 — LLM Integration & System Prompts

- [ ] `backend/app/llm/claude.py` — async client with `stream_complete` + `complete`
- [ ] `backend/app/llm/prompts/__init__.py`
- [ ] `backend/app/llm/prompts/citizen.py` (verbatim from spec)
- [ ] `backend/app/llm/prompts/agent.py` (verbatim from spec)
- [ ] `backend/app/llm/prompts/template.py` (verbatim from spec)
- [ ] `backend/app/llm/prompts/summary.py` (verbatim from spec)
- [ ] `backend/tests/test_claude.py` — Albanian query → Albanian response

**Commit:** `feat(llm): Claude Haiku client + 4 multilingual system prompts`

---

## PHASE 5 — Backend: Citizen Endpoints

- [ ] `backend/app/routers/citizen.py`
- [ ] `GET /api/services` (paginated, filterable by category)
- [ ] `GET /api/services/{service_id}` (full detail)
- [ ] `GET /api/search?q=...` (smart_search)
- [ ] `POST /api/chat` (SSE: token, citation, structured, done) + QueryLog
- [ ] `POST /api/voice/transcribe` (Whisper)
- [ ] Register router in `main.py`
- [ ] `backend/tests/test_citizen.py`

**Commit:** `feat(api): citizen endpoints — chat SSE, search, services, voice transcribe`

---

## PHASE 6 — Backend: Agent Co-Pilot Endpoints

- [ ] `backend/app/routers/agent.py`
- [ ] `WS /ws/agent/suggest` — JWT auth, 300ms debounce, JSON response
- [ ] `POST /api/agent/template/personalize`
- [ ] `POST /api/agent/summary`
- [ ] `GET /api/agent/templates?service_id=...`
- [ ] `POST /api/agent/log-helpful`
- [ ] Register router
- [ ] WebSocket smoke test (wscat or HTML page)

**Commit:** `feat(api): agent co-pilot WebSocket + template + summary endpoints`

---

## PHASE 7 — Backend: Admin Endpoints + Auth

- [ ] `backend/app/middleware/auth.py` — JWT helpers + `require_admin/agent` deps
- [ ] `backend/app/routers/auth.py` — `POST /api/auth/login`
- [ ] `backend/app/routers/admin.py` (all require admin):
  - [ ] Services CRUD + reindex
  - [ ] Templates CRUD
  - [ ] Documents upload/list/delete
  - [ ] Sources add/list/delete/reindex
  - [ ] Analytics endpoint
- [ ] `backend/app/ingestion/pdf_parser.py`
- [ ] `backend/app/ingestion/docx_parser.py`
- [ ] `backend/app/ingestion/scraper.py` (Playwright + BS4)
- [ ] Background tasks for indexing
- [ ] E2E: login → CRUD service → reindex → query reflects update

**Commit:** `feat(api): admin CRUD + auth + document/URL ingestion pipelines`

---

## PHASE 8 — Frontend: Setup

- [ ] `npx create-next-app@14 frontend` (typescript, tailwind, app router, no src)
- [ ] Install zustand, lucide-react, radix, clsx, tailwind-merge
- [ ] `npx shadcn@latest init` + add components (button, card, dialog, etc.)
- [ ] `frontend/lib/api.ts` — typed client
- [ ] `frontend/lib/stream.ts` — SSE parser
- [ ] `frontend/lib/websocket.ts` — `AgentSuggestSocket`
- [ ] `frontend/lib/i18n.ts` — sq/en/sr UI strings + `useT`
- [ ] `frontend/lib/store.ts` — zustand global state, persisted
- [ ] `frontend/.env.example`
- [ ] Verify `npm run dev` runs

**Commit:** `chore(frontend): Next.js + Tailwind + shadcn setup with i18n and API clients`

---

## PHASE 9 — Frontend: Citizen UI

- [ ] `app/layout.tsx` — font scale + contrast applied, header
- [ ] `components/AccessibilityPanel.tsx`
- [ ] `app/page.tsx` — hero, search, voice, 8 quick tiles
- [ ] `app/services/page.tsx` — grid + filter chips
- [ ] `app/services/[id]/page.tsx` — detail + StepWalker + FAQs + Ask ZANA
- [ ] `components/citizen/StepWalker.tsx`
- [ ] `app/chat/page.tsx` — streaming, citations, structured blocks, read aloud
- [ ] `components/citizen/VoiceInput.tsx` (MediaRecorder → transcribe)
- [ ] `components/citizen/ReadAloudButton.tsx` (speechSynthesis)
- [ ] `components/citizen/CitationCard.tsx`
- [ ] E2E flow test

**Commit:** `feat(citizen): full citizen UI with chat, voice, accessibility, step walker`

---

## PHASE 10 — Frontend: Agent Co-Pilot UI

- [ ] `app/agent/login/page.tsx`
- [ ] `app/agent/page.tsx` — 3-column grid (280px 1fr 320px)
- [ ] `components/agent/CallerContextPanel.tsx`
- [ ] `components/agent/SmartSearchBar.tsx` (200ms client debounce)
- [ ] `components/agent/SuggestionsPanel.tsx` (WS subscription)
- [ ] `components/agent/ConfidenceIndicator.tsx`
- [ ] `components/agent/TemplatesLibrary.tsx`
- [ ] `components/agent/TemplateModal.tsx`
- [ ] `components/agent/AfterCallSummary.tsx`
- [ ] WebSocket reconnect logic
- [ ] E2E: type → suggestions < 1s → copy template → summary

**Commit:** `feat(agent): co-pilot dashboard with WebSocket suggestions, templates, summaries`

---

## PHASE 11 — Frontend: Admin UI

- [ ] `app/admin/login/page.tsx`
- [ ] `app/admin/layout.tsx` — sidebar
- [ ] `app/admin/services/page.tsx` — table + editor
- [ ] `components/admin/ServiceEditor.tsx` — multilingual tabs, nested arrays
- [ ] `app/admin/templates/page.tsx`
- [ ] `app/admin/documents/page.tsx` — drag-drop, status
- [ ] `app/admin/sources/page.tsx`
- [ ] `app/admin/analytics/page.tsx`
- [ ] `app/admin/playground/page.tsx` — RAG vs no-RAG comparison
- [ ] All admin flows tested

**Commit:** `feat(admin): full admin panel — services, templates, docs, sources, analytics, playground`

---

## PHASE 12 — Polish, Docker, Demo Prep

- [ ] Root `docker-compose.yml`
- [ ] `backend/Dockerfile` (python:3.11-slim + playwright)
- [ ] `frontend/Dockerfile` (node:20-alpine)
- [ ] README updated with one-command setup
- [ ] Smoke test full flow (all 3 personas)
- [ ] `DEMO_SCRIPT.md` (3-min flow)
- [ ] Backup screenshots
- [ ] Backup demo video (2 min)
- [ ] Tag `v1.0-hackathon`

**Commit:** `chore: Docker compose, README, demo script, smoke tests passed`

---

## Final Acceptance Checklist

### Functional
- [ ] All 10 services in catalogue, fully populated multilingual
- [ ] Citizen chat streams tokens visibly (not bulk)
- [ ] Citations link to real source URLs
- [ ] Structured procedure block renders with icons
- [ ] Simple Mode visibly shortens responses
- [ ] Voice input works in Chrome
- [ ] Read aloud works in Chrome
- [ ] Step walker saves progress in localStorage
- [ ] Agent suggestions arrive < 1s
- [ ] Confidence indicator shows correct colors
- [ ] Template personalization fills placeholders correctly
- [ ] After-call summary generates 3-4 sentence Albanian text
- [ ] Admin can CRUD service with full multilingual data
- [ ] Admin upload PDF → chunks indexed → retrievable
- [ ] Playground shows clear RAG vs no-RAG difference

### Quality
- [ ] No console errors in browser
- [ ] No 500s in backend logs during demo flow
- [ ] All API responses < 3s (except streaming)
- [ ] Mobile-responsive citizen UI
- [ ] All buttons have aria-label
- [ ] Keyboard navigation works
- [ ] Focus states visible

### Repo
- [ ] All commits pushed to `main`
- [ ] README has setup instructions
- [ ] `.env.example` files complete
- [ ] No secrets committed
- [ ] `v1.0-hackathon` tag created

---

## Session Notes / Decisions Log

> Add dated entries when decisions are made or surprises happen. Keep terse.

- **2026-05-21** — Tracking docs created. Project skeleton: only `.gitignore` and stub `README.md` exist. Awaiting go-ahead for Phase 1.
- **2026-05-21** — Phase 1 done. FastAPI skeleton boots; `/health` 200 OK. Added `pydantic-settings`, `pytest`, `pytest-asyncio` to requirements (not in original spec but needed for config + tests).
- **2026-05-21** — Amended Phase 1 commit: changed author name from `Gzim` → `Gzim Maksuti`, removed Claude `Co-Authored-By` trailer; force-pushed to `origin/main`. New SHA `37d5c56`. Set local `user.name`/`user.email` so future commits land correctly.
- **2026-05-21** — Phase 2 done. SQLAlchemy 2.0.36 pinned in the spec couldn't parse `Mapped[X | None]` on Python 3.14 — bumped pin to `>=2.0.49,<2.1`. Seed creates 10 services and is idempotent (re-running keeps the same IDs and counts).
- **2026-05-21** — Phase 3 code complete. No OpenAI key available locally so the indexer hasn't been run end-to-end yet — Chroma collection still empty. Chunker unit tests pass; live retrieval test auto-skips. Decision to skip live verification was an explicit user choice.
