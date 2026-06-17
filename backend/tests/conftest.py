"""Shared pytest fixtures for the backend test suite.

`pytest-asyncio` in strict mode requires async tests to be explicitly marked,
which the per-test `@pytest.mark.asyncio` decorator already does. We just set
the default loop scope so all coroutines share one loop per session.
"""
from __future__ import annotations

import pytest

pytest_plugins = ("pytest_asyncio",)


@pytest.fixture(scope="session")
def anyio_backend() -> str:  # used if anyio-style tests sneak in
    return "asyncio"
