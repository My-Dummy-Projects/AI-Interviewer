from fastapi import FastAPI, APIRouter, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from config import VAPI_PUBLIC_KEY, VAPI_ASSISTANT_ID, CORS_ORIGINS
from models import ConfigResponse
from routes_user import api_router_user
from routes_interview import api_router_interview
from routes_auth import api_router_auth
from routes_payments import api_router_payments

MAX_BODY_SIZE = 5 * 1024 * 1024  # 5 MB


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            raise HTTPException(status_code=413, detail="Request body too large")
        return await call_next(request)


app = FastAPI(title="AI Voice Mock Interview MVP")

api_base = APIRouter(prefix="/api")


@api_base.get("/")
async def root():
    return {"message": "AI Voice Mock Interview API"}


@api_base.get("/config", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        vapiPublicKey=VAPI_PUBLIC_KEY,
        vapiAssistantId=VAPI_ASSISTANT_ID,
        ready=bool(VAPI_PUBLIC_KEY and VAPI_ASSISTANT_ID),
    )


app.include_router(api_base)
app.include_router(api_router_user)
app.include_router(api_router_interview)
app.include_router(api_router_auth)
app.include_router(api_router_payments)
app.add_middleware(BodySizeLimitMiddleware)
if CORS_ORIGINS == '*':
    origins = ['*']
else:
    origins = [o.strip() for o in CORS_ORIGINS.split(',') if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=origins != ['*'],
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
