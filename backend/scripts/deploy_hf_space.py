"""Deploy the backend to a Hugging Face Docker Space.

    HF_TOKEN=hf_... python -m scripts.deploy_hf_space <user>/<space> [--secrets-file path]

Copies the backend into a temporary folder shaped the way Spaces expect
(Dockerfile.deploy becomes Dockerfile, a README.md with the Space settings),
creates the Space if needed and uploads it. Each KEY=value line in the secrets
file becomes a Space secret; values are never printed.
"""
from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

from huggingface_hub import HfApi

BACKEND = Path(__file__).resolve().parent.parent
SKIP = {".venv", ".pytest_cache", "__pycache__", "chroma_data", "uploads", "tests", "eval", ".env"}
SKIP_PREFIXES = (".venv",)
SKIP_SUFFIXES = (".db", ".pyc")

SPACE_README = """---
title: ZANA API
emoji: 🏛️
colorFrom: blue
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
short_description: Backend for ZANA, an assistant for Kosovo public services
---

Backend of [ZANA](https://github.com/rinorze/Zana-AI). Health check: `/health`.
This is a demo, not affiliated with the Government of Kosovo or eKosova.
"""


def ignore(_dir: str, names: list[str]) -> list[str]:
    return [
        n for n in names
        if n in SKIP or n.startswith(SKIP_PREFIXES) or n.endswith(SKIP_SUFFIXES)
    ]


def read_secrets(path: Path) -> dict[str, str]:
    secrets: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        secrets[key.strip()] = value.strip().strip('"').strip("'")
    return secrets


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("space", help="<user>/<space-name>")
    parser.add_argument("--secrets-file", type=Path)
    args = parser.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        print("Set HF_TOKEN first.", file=sys.stderr)
        return 1
    api = HfApi(token=token)
    api.create_repo(args.space, repo_type="space", space_sdk="docker", exist_ok=True)

    if args.secrets_file:
        for key, value in read_secrets(args.secrets_file).items():
            api.add_space_secret(args.space, key, value)
            print(f"secret set: {key}")

    with tempfile.TemporaryDirectory() as tmp:
        stage = Path(tmp) / "space"
        shutil.copytree(BACKEND, stage, ignore=ignore)
        (stage / "Dockerfile").unlink(missing_ok=True)
        (stage / "Dockerfile.deploy").rename(stage / "Dockerfile")
        (stage / "README.md").write_text(SPACE_README, encoding="utf-8")
        api.upload_folder(
            repo_id=args.space,
            repo_type="space",
            folder_path=stage,
            commit_message="Deploy ZANA backend",
            delete_patterns=["*"],
        )
    print(f"Uploaded. https://huggingface.co/spaces/{args.space}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
