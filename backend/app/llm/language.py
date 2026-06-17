"""Lightweight 3-language detector for ZANA (sq / en / sr).

We could pull in fastText or langdetect but they add ~50MB and a model download
for a problem that is essentially "is this Albanian, English, or Serbian?".
A keyword + character-class heuristic is good enough for routing prompts.
"""
from __future__ import annotations

import re

SUPPORTED = ("sq", "en", "sr")

_CYRILLIC_RE = re.compile(r"[Ѐ-ӿ]")

# Tiny stopword sets — biased toward call-center vocabulary (passport, ID, fee, etc).
_SQ_HINTS = {
    "pasaporta", "pasaportë", "letërnjoftim", "çertifikatë", "certifikatë", "sa", "kushton",
    "çfarë", "si", "ku", "ditë", "nevojshme", "dokumentet", "tarifa", "zyra", "shqip",
    "edhe", "është", "për", "tek", "jam", "lutem", "faleminderit", "marteseje",
    "regjistrim", "biznes", "vetëm",
}
_EN_HINTS = {
    "the", "is", "are", "how", "what", "where", "passport", "fee", "cost", "i", "do",
    "need", "documents", "office", "english", "please", "thanks", "thank", "you",
    "and", "or",
}
_SR_HINTS = {
    "pasos", "licna", "lična", "karta", "koliko", "kosta", "treba", "dokumenti",
    "kancelarija", "molim", "hvala", "ja", "ti", "da", "ne", "kako", "gde",
    "registracija", "biznis",
}


def detect_language(text: str) -> str:
    """Return one of "sq", "en", "sr". Defaults to "sq"."""
    if not text or not text.strip():
        return "sq"

    if _CYRILLIC_RE.search(text):
        return "sr"

    lowered = text.lower()
    # Albanian-specific characters are a strong signal.
    if any(ch in lowered for ch in ("ë", "ç")):
        return "sq"

    tokens = re.findall(r"[a-zA-ZçČčćĆšŠžŽđĐ]+", lowered)
    if not tokens:
        return "sq"

    token_set = set(tokens)
    score_sq = len(token_set & _SQ_HINTS)
    score_en = len(token_set & _EN_HINTS)
    score_sr = len(token_set & _SR_HINTS)

    best = max(score_sq, score_en, score_sr)
    if best == 0:
        return "sq"
    if score_en == best:
        return "en"
    if score_sr == best:
        return "sr"
    return "sq"
