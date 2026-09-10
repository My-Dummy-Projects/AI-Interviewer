"""Rate limiting configuration for the API.

A single shared SlowAPI ``Limiter`` is defined here and attached to the
app in ``app.py``. Per-endpoint limits are applied with ``@limiter.limit``
decorators (e.g. 5/minute on feedback generation).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute"],
)