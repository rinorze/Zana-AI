"""Prompt for the after-call CRM summary."""

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


def build_summary_prompt(service: str, queries: str, suggestions: str, notes: str) -> str:
    return SUMMARY_PROMPT.format(
        service=service or "—",
        queries=queries or "—",
        suggestions=suggestions or "—",
        notes=notes or "—",
    )
