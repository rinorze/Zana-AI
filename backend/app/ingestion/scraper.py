"""Fetch and clean HTML pages for indexing.

Tries Playwright first (handles JS-rendered eKosova pages); falls back to a
plain httpx GET if Playwright isn't installed or fails. BeautifulSoup strips
the boilerplate; we keep the page title separately so it lands in the
``sources.title`` column.
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup

PLAYWRIGHT_TIMEOUT_MS = 15000


@dataclass
class ScrapedPage:
    url: str
    title: str
    text: str


def _strip_boilerplate(html: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "nav", "footer", "header", "aside", "form"]):
        tag.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    main = soup.find("main") or soup.find("article") or soup.body or soup
    text = main.get_text("\n", strip=True)
    # Collapse runs of blank lines.
    lines = [line for line in (l.strip() for l in text.splitlines()) if line]
    return title, "\n".join(lines)


async def _fetch_with_httpx(url: str) -> str:
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
        response = await client.get(url, headers={"User-Agent": "ZANA-Indexer/0.1"})
        response.raise_for_status()
        return response.text


async def _fetch_with_playwright(url: str) -> str | None:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return None

    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            try:
                page = await browser.new_page()
                await page.goto(url, wait_until="networkidle", timeout=PLAYWRIGHT_TIMEOUT_MS)
                return await page.content()
            finally:
                await browser.close()
    except Exception:
        return None


async def scrape_url(url: str, *, use_browser: bool = True) -> ScrapedPage:
    html: str | None = None
    if use_browser:
        html = await _fetch_with_playwright(url)
    if html is None:
        html = await _fetch_with_httpx(url)
    title, text = _strip_boilerplate(html)
    return ScrapedPage(url=url, title=title, text=text)
