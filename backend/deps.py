"""Authentication dependencies for the FastAPI app.

Provides FastAPI ``Depends`` helpers that resolve a bearer token into an
authenticated user, plus utilities for normalizing user IDs between the
Clerk and Supabase identity systems.
"""
import uuid
from types import SimpleNamespace
from typing import Optional

from fastapi import HTTPException, Header

from config import logger, supabase, CLERK_JWT_ISSUER


def _verify_with_supabase(token: str):
    """Verify a bearer token against Supabase Auth.

    Returns a lightweight ``SimpleNamespace`` user or ``None`` on failure.
    """
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


def _verify_with_clerk(token: str):
    """Verify a Clerk-issued JWT by signature against Clerk's JWKS endpoint.

    Returns a lightweight ``SimpleNamespace`` user or ``None`` on failure.
    """
    try:
        import jwt
        from jwt import PyJWKClient
        jwks_url = f"{CLERK_JWT_ISSUER}/.well-known/jwks.json"
        jwks_client = PyJWKClient(jwks_url, cache_keys=True)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_JWT_ISSUER,
        )
        user_id = claims.get("sub", "")
        if not user_id:
            return None
        email = claims.get("email", "") or ""
        name = claims.get("name", "") or ""
        logger.info(f"Auth verified via Clerk JWT for user {user_id}")
        return SimpleNamespace(id=user_id, email=email, name=name)
    except Exception as e:
        logger.warning(f"Clerk JWT verification failed: {e}")
        return None


def normalize_user_id(user_id: str) -> str:
    """Convert a Clerk-style user ID into a stable UUID string.

    Clerk uses ``user_xxxx``-style IDs that are not valid UUIDs, while the
    database stores UUIDs. Existing UUIDs pass through unchanged; anything
    else is deterministically mapped to a UUID (UUID5) so the same Clerk ID
    always normalizes to the same database ID.
    """
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


async def get_current_user(authorization: Optional[str] = Header(None)):
    """FastAPI dependency: require a valid bearer token.

    Raises ``HTTPException`` (401) when the token is missing or cannot be
    verified by Clerk or Supabase.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    parts = authorization.split(" ")
    if len(parts) < 2 or not parts[1]:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = parts[1]

    user = _verify_with_clerk(token)
    if user:
        return user

    user = _verify_with_supabase(token)
    if user:
        return user

    raise HTTPException(status_code=401, detail="Invalid or expired token")


async def try_get_user(authorization: Optional[str] = Header(None)):
    """FastAPI dependency: optional authentication.

    Like ``get_current_user`` but returns ``None`` instead of raising,
    allowing endpoints to degrade gracefully when no valid token is present.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    parts = authorization.split(" ")
    if len(parts) < 2 or not parts[1]:
        return None
    token = parts[1]

    user = _verify_with_clerk(token)
    if user:
        return user

    user = _verify_with_supabase(token)
    if user:
        return user

    return None