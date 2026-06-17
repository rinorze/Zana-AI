# ZANA

AI assistant for Kosovo public services (eKosova). Three personas:

- **Citizen** — chat + voice + accessibility, navigates procedures in SQ / EN / SR.
- **Agent Co-Pilot** — real-time WebSocket suggestions, templates, after-call summaries.
- **Admin** — catalogue CRUD, document/URL ingestion, analytics, RAG playground.

RAG-backed (ChromaDB + OpenAI embeddings) with Claude Haiku 4.5 generation.

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env       # fill in API keys + passwords
docker compose up --build
docker compose exec backend python -m scripts.seed
docker compose exec backend python -m scripts.index_catalogue
```

Then:

- Citizen: <http://localhost:3000>
- Agent: <http://localhost:3000/agent/login>
- Admin: <http://localhost:3000/admin/login>

Default credentials live in `backend/.env` (`ADMIN_USERNAME`/`ADMIN_PASSWORD`, `AGENT_USERNAME`/`AGENT_PASSWORD`).

## Local dev (without Docker)

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add keys
python -m scripts.seed
python -m scripts.index_catalogue
uvicorn app.main:app --reload

# Frontend (new shell)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Tests

```bash
cd backend && pytest -q
cd frontend && npx tsc --noEmit && npm run build
```

## Docs

- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — frozen build spec.
- [`PROGRESS.md`](./PROGRESS.md) — phase tracker.
- [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) — 3-minute hackathon demo walkthrough.

## Tech stack

- Backend: FastAPI 0.115, SQLAlchemy 2, ChromaDB 0.5, Anthropic + OpenAI SDKs, Playwright.
- Frontend: Next.js 14 (App Router), Tailwind, shadcn-style Radix components, Zustand.
