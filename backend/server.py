"""ASGI entrypoint for production (e.g. ``uvicorn server:app``).

Delegates to the application assembled in ``app.py``. Creating a tiny
wrapper module here keeps the app object importable without executing any
framework-specific entry logic.
"""

from app import app

__all__ = ["app"]