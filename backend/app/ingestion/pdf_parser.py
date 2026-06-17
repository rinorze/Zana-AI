"""Extract plain text from uploaded PDFs (pypdf, no OCR)."""
from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader


def parse_pdf(content: bytes) -> str:
    if not content:
        return ""
    reader = PdfReader(BytesIO(content))
    parts: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        if text.strip():
            parts.append(text.strip())
    return "\n\n".join(parts)
