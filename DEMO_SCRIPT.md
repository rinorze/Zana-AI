# ZANA — 3-Minute Demo Script

## 0:00 — Opening (15 s)
- Frame: "ZANA — AI për eKosova, në shqip, anglisht, dhe serbisht."
- Open <http://localhost:3000>.

## 0:15 — Citizen flow (60 s)
1. On the hero, type **"Sa kushton pasaporta?"** → Enter.
2. Show streaming tokens, citations panel populating on the right.
3. After the answer finishes, point out the structured procedure block (📋 / 💶 / ⏱️ / 🏢).
4. Open the Accessibility panel → enable **Simple Mode** + **High Contrast**.
5. Resend the same question — the answer comes back in short sentences, high-contrast theme is visible.
6. Click the speaker icon → read-aloud kicks in.

## 1:15 — Service detail + StepWalker (35 s)
- Top nav → **Shërbimet** → "Pasaporta".
- Show docs / fee / duration / office stats.
- Walk through 2 steps in the StepWalker; progress is saved in localStorage.

## 1:50 — Agent Co-Pilot (45 s)
- Open <http://localhost:3000/agent/login>; sign in with the `agent` credentials.
- In the SmartSearch bar, type **"pasaport për herë të parë"**.
- Suggestions appear < 1 s with confidence badges.
- Click a template in the left panel → fill `citizen_name` → **Gjenero** → copy.
- Click **Gjenero përmbledhjen** on the right to show after-call summary.

## 2:35 — Admin & ingestion (20 s)
- Open <http://localhost:3000/admin/login>; sign in with the `admin` credentials.
- Show **Services** list → open an editor (multilingual tabs).
- Show **Documents** drag-drop and **Sources** URL queue.
- Show **Analytics** with the queries just generated.
- Open **Playground** → demonstrate RAG vs no-RAG side-by-side.

## 2:55 — Wrap (5 s)
- "Tre persona, RAG i indeksuar, streaming, voice. Kodi në GitHub."

## Backup
- If WebSocket is flaky, use the citizen flow only (chat + accessibility + service detail).
- If Claude is down, the chat surfaces an inline error and citations still render.

## Required state before demo
- `backend/.env` filled with real API keys.
- `python -m scripts.seed && python -m scripts.index_catalogue` executed.
- At least one document uploaded under Admin → Dokumentet (optional but pretty).
- A handful of QueryLog rows for the Analytics view (run a few citizen questions before going live).
