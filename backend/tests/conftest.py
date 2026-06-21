"""Shared pytest fixtures."""

from __future__ import annotations

import os

# Force test environment before app imports config.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
