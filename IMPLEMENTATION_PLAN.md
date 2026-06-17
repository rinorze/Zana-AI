# ZANA — Technical Implementation Spec

> **Frozen reference of the build spec.** Do not edit during implementation — use `PROGRESS.md` to track work. If the spec needs to change, update this file and note the reason in `PROGRESS.md`'s "Session Notes" section.

---

## Project Summary

**ZANA** — AI assistant for Kosovo public services (eKosova). Three personas:

1. **Citizen** — chat + voice + accessibility (Simple Mode, high contrast, read aloud) for navigating procedures (passport, ID, certificates, business registration, etc.) in Albanian / English / Serbian.
2. **Agent Co-Pilot** — real-time WebSocket suggestions for call-center agents, template personalization, after-call summaries.
3. **Admin** — CRUD over the service catalogue, document/URL ingestion, analytics, RAG playground.

Backed by a RAG pipeline (ChromaDB + OpenAI embeddings) with Claude Haiku 4.5 as the generation model.

---

## Tech Stack (exact versions)

### Backend (`backend/requirements.txt`)

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
anthropic==0.39.0
openai==1.54.0
chromadb==0.5.15
sqlalchemy==2.0.36
pydantic==2.9.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
pypdf==5.1.0
python-docx==1.1.2
playwright==1.48.0
beautifulsoup4==4.12.3
websockets==13.1
python-dotenv==1.0.1
httpx==0.27.2
aiofiles==24.1.0
```

### Frontend (`frontend/package.json` key deps)

- next@14.2.x
- react@18.3.x
- typescript@5.x
- tailwindcss@3.4.x
- @radix-ui/* (via shadcn)
- lucide-react
- zustand (state)

---

## Environment Variables (`backend/.env.example`)

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
JWT_SECRET=<random-64-char-string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
AGENT_USERNAME=agent
AGENT_PASSWORD=changeme
CHROMA_PERSIST_DIR=./chroma_data
DATABASE_URL=sqlite:///./zana.db
CLAUDE_MODEL=claude-haiku-4-5-20251001
EMBEDDING_MODEL=text-embedding-3-small
FRONTEND_URL=http://localhost:3000
```

---

## Directory Structure

```
backend/
  app/
    __init__.py
    main.py
    config.py
    catalogue/        # models.py, crud.py
    rag/              # chunker.py, embedder.py, vectorstore.py, retriever.py, search.py
    llm/
      claude.py
      prompts/        # __init__.py, citizen.py, agent.py, template.py, summary.py
    ingestion/        # pdf_parser.py, docx_parser.py, scraper.py
    routers/          # citizen.py, agent.py, admin.py, auth.py
    voice/            # transcribe helpers
    middleware/       # auth.py
    db/               # database.py
  data/
    seed_services.json
  scripts/
    seed.py
    index_catalogue.py
  tests/
    test_rag.py
    test_claude.py
    test_citizen.py
  requirements.txt
  .env.example
  .gitignore
  Dockerfile

frontend/
  app/
    layout.tsx
    page.tsx
    chat/page.tsx
    services/{page.tsx, [id]/page.tsx}
    agent/{login/page.tsx, page.tsx}
    admin/{login/page.tsx, layout.tsx, page.tsx, services/page.tsx, templates/page.tsx,
           documents/page.tsx, sources/page.tsx, analytics/page.tsx, playground/page.tsx}
  components/
    AccessibilityPanel.tsx
    citizen/{StepWalker.tsx, VoiceInput.tsx, ReadAloudButton.tsx, CitationCard.tsx}
    agent/{CallerContextPanel.tsx, SmartSearchBar.tsx, SuggestionsPanel.tsx,
           ConfidenceIndicator.tsx, TemplatesLibrary.tsx, TemplateModal.tsx,
           AfterCallSummary.tsx}
    admin/{ServiceEditor.tsx, ...}
  lib/
    api.ts
    stream.ts
    websocket.ts
    i18n.ts
    store.ts
  .env.example
  Dockerfile
  package.json
  tailwind.config.ts

docker-compose.yml
README.md
PROGRESS.md
IMPLEMENTATION_PLAN.md   ← this file
DEMO_SCRIPT.md           ← created in Phase 12
```

---

## Seed JSON Structure (one service)

```json
{
  "service_id": "pasaporta",
  "category": "Dokumente Civile",
  "names": {"sq": "Pasaporta", "en": "Passport", "sr": "Pasoš"},
  "description": {
    "sq": "Pasaporta është dokument udhëtimi që lëshohet nga MPB për shtetasit e Kosovës.",
    "en": "Passport is a travel document issued by MIA for Kosovo citizens.",
    "sr": "Pasoš je putna isprava koju izdaje MUP za građane Kosova."
  },
  "fee": "25 EUR (10-vjeçare) / 15 EUR (5-vjeçare)",
  "duration": "10 ditë pune",
  "office": "Zyra e Gjendjes Civile",
  "office_locations": [
    {"city": "Prishtinë", "address": "Rruga e UÇK-së", "hours": "08:00-16:00 H-P"}
  ],
  "required_documents": ["Letërnjoftim valid", "Çertifikatë lindjeje", "Fotografi biometrike (në sportel)"],
  "steps": [
    {"order": 1, "titles": {"sq": "Mblidhni dokumentet"}, "descriptions": {"sq": "..."}, "required_items": ["..."]}
  ],
  "faqs": [
    {"questions": {"sq": "A mund të aplikoj online?"}, "answers": {"sq": "..."}}
  ],
  "response_templates": [
    {
      "scenario": "first_time_application",
      "templates": {
        "sq": "Përshëndetje {citizen_name}. Për pasaportë për herë të parë ju duhen: {document_list}. Tarifa: {fee}. Koha: {duration}.",
        "en": "Hello {citizen_name}. ...",
        "sr": "..."
      },
      "placeholders": ["citizen_name", "document_list", "fee", "duration"]
    }
  ],
  "source_urls": ["https://ekosova.rks-gov.net/sherbimet/pasaporta"],
  "last_verified": "2026-05-21"
}
```

---

## System Prompts (verbatim)

### `prompts/citizen.py`

```python
CITIZEN_SYSTEM_PROMPT = """Ti je ZANA, asistente AI për shërbimet publike të Kosovës.

ROLI YT:
Ndihmon qytetarët të kuptojnë procedurat e eKosova-s dhe shërbimet publike të Kosovës.

RREGULLA TË DETYRUESHME:
1. Detekto gjuhën e pyetjes (shqip / anglisht / serbisht) dhe përgjigju GJITHMONË në të njëjtën gjuhë.
2. Përdor VETËM informacionet nga konteksti i dhënë më poshtë. Nuk shpik tarifa, data, ose emra zyrash.
3. Nëse informacioni nuk është në kontekst, thuaj: "Nuk kam informacion të saktë për këtë në burimet e mia. Ju lutem vizitoni eKosova.rks-gov.net ose kontaktoni call center-in."
4. Cito gjithmonë burimet me markerët [1], [2] etj. që përkojnë me chunks e dhënë.
5. Për procedurat, përfundo me bllokun e strukturuar:

📋 Dokumentet e nevojshme: [listë]
💶 Tarifa: [shuma]
⏱️ Koha: [kohëzgjatja]
🏢 Zyra: [emri]

6. Trajto qytetarët me respekt. Mos përdor zhargon teknik kur nuk është i nevojshëm.

KONTEKSTI I DHËNË:
{context}
"""

SIMPLE_MODE_ADDITION = """
RREGULL SHTESË (SIMPLE MODE AKTIV):
- Fjali shumë të shkurtra (maks 12 fjalë).
- Pa terma teknikë. Përdor sinonime të zakonshme.
- Hapat numëroji 1, 2, 3.
- Mos përdor fjali të nënrenditura.
"""
```

### `prompts/agent.py`

```python
AGENT_SUGGESTION_PROMPT = """Ti je ZANA Co-Pilot për agjentët e call center-it të eKosova-s.

KONTEKSTI:
Agjenti është duke folur me një qytetar në telefon. Ai/ajo shkruan disa fjalë kyçe ose pyetjen e qytetarit. Ti i jep 1-3 sugjerime që agjenti mund t'ia thotë qytetarit menjëherë.

RREGULLA:
1. JI I SHKURTËR. Çdo sugjerim maksimum 2-3 fjali.
2. Përgjigjja në shqip përveç nëse input-i është në anglisht/serbisht.
3. JI I SAKTË. Përdor vetëm informacionet nga konteksti. Mos shpik.
4. Nëse nuk je i sigurt: "Verifiko në katalog para se të përgjigjesh."

FORMAT I DALJES (JSON i vlefshëm):
{{
  "suggestions": [
    {{
      "text": "Teksti i sugjerimit",
      "confidence": 0.95,
      "source": "Emri i shërbimit"
    }}
  ]
}}

CONFIDENCE:
- 0.8-1.0: info direkt në kontekst, e verifikuar
- 0.5-0.8: info e pjesshme, agjenti duhet të konfirmojë
- 0.0-0.5: kontekst i pamjaftueshëm

KONTEKSTI:
{context}
"""
```

### `prompts/template.py`

```python
TEMPLATE_PERSONALIZATION_PROMPT = """Ti je ZANA Template Engine.

DETYRA:
Personalizo template-in duke plotësuar placeholder-at me të dhënat e dhëna.

RREGULLA:
1. Plotëso TË GJITHA placeholder-at e formës {{variable_name}}.
2. Nëse mungon ndonjë e dhënë, përdor frazë gjenerike por mos shpik fakte.
3. Mos shto info të reja jashtë template-it.
4. Përgjigju vetëm me tekstin e personalizuar, pa koment shtesë.

TEMPLATE:
{template}

TË DHËNAT:
{variables}

PËRGJIGJJA:
"""
```

### `prompts/summary.py`

```python
SUMMARY_PROMPT = """Ti je ZANA. Krijo një përmbledhje të shkurtër (3-4 fjali) të thirrjes së kryer nga agjenti.

FORMAT:
- Çfarë kërkoi qytetari (1 fjali)
- Çfarë veprime u ndërmorën (1-2 fjali)
- Statusi përfundimtar / hapat e ardhshëm (1 fjali)

GJUHA: Shqip, ton zyrtar për sistem CRM.

DETAJET E THIRRJES:
- Shërbimi: {service}
- Pyetjet: {queries}
- Sugjerimet e përdorura: {suggestions}
- Notes manualë: {notes}

PËRMBLEDHJA:
"""
```

---

## Key Code Snippets

### SSE chat endpoint (FastAPI)

```python
from fastapi.responses import StreamingResponse
import json

@router.post("/chat")
async def chat(req: ChatRequest):
    async def event_stream():
        chunks = await retrieve(req.message, top_k=5)
        # build context, system prompt, messages
        async for token in claude.stream_complete(system, messages):
            yield f"data: {json.dumps({'type':'token','content':token})}\n\n"
        # emit citations + structured + done
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

### Agent WebSocket with debounce

```python
from fastapi import WebSocket, WebSocketDisconnect
import asyncio

@router.websocket("/ws/agent/suggest")
async def agent_suggest(ws: WebSocket, token: str):
    await verify_agent_token(token)
    await ws.accept()
    debounce_task = None
    try:
        while True:
            data = await ws.receive_json()
            if debounce_task: debounce_task.cancel()
            debounce_task = asyncio.create_task(process_after_debounce(ws, data))
    except WebSocketDisconnect:
        pass

async def process_after_debounce(ws, data):
    await asyncio.sleep(0.3)
    chunks = await retrieve(data["input"], filter={"service_id": data.get("current_service")})
    suggestions = await claude_agent_suggest(data["input"], chunks)
    await ws.send_json(suggestions)
```

---

## Git Workflow

```bash
git add .
git commit -m "<type>(<scope>): <description>"
git push origin main
```

**Commit types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`
**Scopes:** `catalogue`, `rag`, `llm`, `api`, `citizen`, `agent`, `admin`, `frontend`, `backend`

**Examples:**
- `feat(agent): add confidence indicator tooltips`
- `fix(rag): handle empty retrieval results`
- `chore: update env example with new keys`

---

## Troubleshooting Hooks

1. **Retrieval returns nothing** → check Chroma collection has docs (`chroma_client.get_collection("zana").count()`)
2. **Claude returns English when input is Albanian** → check `CITIZEN_SYSTEM_PROMPT` is loaded
3. **WebSocket disconnects immediately** → check JWT in query param, CORS config
4. **Streaming doesn't appear progressively** → check `media_type="text/event-stream"`, no `Content-Length`
5. **Voice input 500** → check OpenAI key valid, audio format webm/ogg/wav
6. **shadcn components not styled** → verify `globals.css` has Tailwind directives + CSS vars

---

## Test Commands

```bash
# Backend
cd backend
uvicorn app.main:app --reload
python -m scripts.seed
python -m scripts.index_catalogue
pytest tests/

# Frontend
cd frontend
npm run dev

# Both
docker compose up --build

# Test chat endpoint
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Sa kushton pasaporta?"}'

# Test agent WS
wscat -c "ws://localhost:8000/ws/agent/suggest?token=<jwt>"
> {"input":"pasaport","current_service":"pasaporta"}
```
