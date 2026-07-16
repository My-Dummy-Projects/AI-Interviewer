from fastapi import HTTPException, Header
from typing import Optional
import jwt
from jwt import PyJWKClient
from types import SimpleNamespace
import uuid

from config import logger, CLERK_JWT_ISSUER

_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None and CLERK_JWT_ISSUER:
        _jwks_client = PyJWKClient(
            f"{CLERK_JWT_ISSUER}/.well-known/jwks.json",
            cache_keys=True,
        )
    return _jwks_client


def _verify_clerk_token(token: str):
    if not CLERK_JWT_ISSUER:
        raise ValueError("Clerk JWT issuer not configured")
    client = _get_jwks_client()
    if not client:
        raise ValueError("Clerk JWKS client not available")
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_JWT_ISSUER,
            options={"verify_aud": False},
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")


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
    try:
        claims = _verify_clerk_token(token)
        user_id = normalize_user_id(claims.get("sub", ""))
        email = claims.get("email", "")
        return SimpleNamespace(id=user_id, email=email)
    except ValueError as e:
        logger.warning(f"Auth check failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def try_get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        claims = _verify_clerk_token(token)
        user_id = normalize_user_id(claims.get("sub", ""))
        email = claims.get("email", "")
        return SimpleNamespace(id=user_id, email=email)
    except Exception:
        return None
