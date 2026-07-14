from fastapi import HTTPException, Header
from typing import Optional

from config import supabase, logger


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        resp = supabase.auth.get_user(token)
        return resp.user
    except Exception as e:
        logger.warning(f"Auth check failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def try_get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    if not supabase:
        return None
    try:
        resp = supabase.auth.get_user(token)
        return resp.user
    except Exception:
        return None
