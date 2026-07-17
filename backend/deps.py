from fastapi import HTTPException, Header
from typing import Optional
from types import SimpleNamespace
import uuid

from config import logger, supabase, CLERK_JWT_ISSUER


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


def _verify_with_clerk(token: str):
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
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]

    user = _verify_with_clerk(token)
    if user:
        return user

    user = _verify_with_supabase(token)
    if user:
        return user

    raise HTTPException(status_code=401, detail="Invalid or expired token")


async def try_get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]

    user = _verify_with_clerk(token)
    if user:
        return user

    user = _verify_with_supabase(token)
    if user:
        return user

    return None
