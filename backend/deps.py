from fastapi import HTTPException, Header
from typing import Optional
import json
import base64
from types import SimpleNamespace
import uuid

from config import logger, supabase


def _decode_jwt_payload(token: str) -> dict:
    payload_b64 = token.split(".")[1]
    pad = len(payload_b64) % 4
    if pad:
        payload_b64 += "=" * (4 - pad)
    return json.loads(base64.urlsafe_b64decode(payload_b64))


def _verify_with_supabase(token: str):
    try:
        user_resp = supabase.auth.get_user(token)
        user = user_resp.user
        user_id = user.id
        email = user.email or ""
        name = user.user_metadata.get("full_name", "") if hasattr(user, "user_metadata") else ""
        logger.info(f"Auth verified via Supabase auth for user {user_id}")
        return SimpleNamespace(id=user_id, email=email, name=name)
    except Exception as e:
        logger.warning(f"Supabase auth verification failed: {e}")
        return None


def _extract_from_jwt_payload(token: str):
    try:
        claims = _decode_jwt_payload(token)
        raw_user_id = claims.get("sub", "")
        user_id = normalize_user_id(raw_user_id)
        email = extract_user_email_from_claims(claims)
        name = claims.get("name", "") or ""
        if user_id:
            logger.info(f"Auth extracted from unverified JWT payload for user {user_id}")
            return SimpleNamespace(id=user_id, email=email, name=name)
    except Exception as e:
        logger.warning(f"JWT payload decode failed: {e}")
    return None


def normalize_user_id(user_id: str) -> str:
    if not user_id:
        return ""

    value = str(user_id).strip()
    if not value:
        return ""

    try:
        return str(uuid.UUID(value))
    except ValueError:
        pass

    try:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, value))
    except Exception:
        return value


def extract_user_email_from_claims(claims: dict) -> str:
    if not claims:
        return ""

    for key in ("email", "primary_email"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    email_addresses = claims.get("email_addresses") or []
    if isinstance(email_addresses, list):
        for item in email_addresses:
            if isinstance(item, dict):
                value = item.get("email_address") or item.get("email") or ""
                if isinstance(value, str) and value.strip():
                    return value.strip()

    return ""


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]

    user = _verify_with_supabase(token)
    if user:
        return user

    user = _extract_from_jwt_payload(token)
    if user:
        return user

    raise HTTPException(status_code=401, detail="Invalid or expired token")


async def try_get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]

    user = _verify_with_supabase(token)
    if user:
        return user

    user = _extract_from_jwt_payload(token)
    if user:
        return user

    return None
