"""Build a folder that deploys the backend to Vercel as one Python function.

    python -m scripts.stage_vercel <out-dir> <vector_index.npz>
    cd <out-dir> && vercel deploy --prod

The folder holds the app, requirements-vercel.txt as requirements.txt, the
exported vector index (scripts/export_index.py) and an index.py entry point.
Settings come from the Vercel project's environment variables; see
"Deploy" in the README for the list.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
INCLUDE = ["app", "scripts", "data", "seed"]

ENTRY = '''"""Vercel entry point: Vercel serves the ASGI app named `app`."""
from app.main import app  # noqa: F401
'''

VERCEL_JSON = """{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "fastapi"
}
"""


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    out, index = Path(sys.argv[1]), Path(sys.argv[2])
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    skip = shutil.ignore_patterns("__pycache__", "*.pyc", "*.db", "chroma_data")
    for name in INCLUDE:
        src = BACKEND / name
        if src.is_dir():
            shutil.copytree(src, out / name, ignore=skip)
    shutil.copy(BACKEND / "requirements-vercel.txt", out / "requirements.txt")
    shutil.copy(index, out / "vector_index.npz")
    (out / "index.py").write_text(ENTRY, encoding="utf-8")
    (out / "vercel.json").write_text(VERCEL_JSON, encoding="utf-8")
    (out / ".python-version").write_text("3.12\n", encoding="utf-8")
    print(f"Staged in {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
