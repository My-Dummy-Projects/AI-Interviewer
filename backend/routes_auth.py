from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from config import supabase
from models import (
    SignUpRequest, SignInRequest, ResetPasswordRequest,
    UpdatePasswordRequest, RefreshTokenRequest, AuthResponse,
)

api_router_auth = APIRouter(prefix="/api/auth")


@api_router_auth.post("/signup", response_model=AuthResponse)
async def signup(req: SignUpRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        resp = supabase.auth.sign_up({"email": req.email, "password": req.password})
        user_id = resp.user.id
        email = resp.user.email or req.email

        existing = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if not existing.data:
            supabase.table("user_profiles").insert({
                "user_id": user_id,
                "email": email,
                "display_name": email.split("@")[0],
                "avatar_url": "",
                "bio": "",
            }).execute()

        return AuthResponse(
            user=resp.user.model_dump() if hasattr(resp.user, 'model_dump') else dict(resp.user),
            session=resp.session.model_dump() if hasattr(resp.session, 'model_dump') else dict(resp.session) if resp.session else {},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router_auth.post("/signin", response_model=AuthResponse)
async def signin(req: SignInRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        resp = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
        return AuthResponse(
            user=resp.user.model_dump() if hasattr(resp.user, 'model_dump') else dict(resp.user),
            session=resp.session.model_dump() if hasattr(resp.session, 'model_dump') else dict(resp.session),
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@api_router_auth.post("/signout")
async def signout(authorization: Optional[str] = Header(None)):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        if authorization and authorization.startswith("Bearer "):
            supabase.auth.sign_out()
        return {"message": "Signed out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router_auth.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        options = {"redirect_to": req.redirect_to} if req.redirect_to else {}
        supabase.auth.reset_password_email(req.email, options=options)
        return {"message": "Password reset email sent"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router_auth.post("/update-password")
async def update_password(req: UpdatePasswordRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        user_resp = supabase.auth.get_user(req.access_token)
        supabase.auth.admin.update_user_by_id(user_resp.user.id, {"password": req.new_password})
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router_auth.post("/refresh", response_model=AuthResponse)
async def refresh_token(req: RefreshTokenRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        session = supabase.auth.refresh_session(req.refresh_token)
        return AuthResponse(
            user=session.user.model_dump() if hasattr(session.user, 'model_dump') else dict(session.user),
            session={
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_in": getattr(session, 'expires_in', 3600),
                "expires_at": getattr(session, 'expires_at', 0),
                "token_type": getattr(session, 'token_type', 'bearer'),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
