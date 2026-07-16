from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from config import VAPI_PUBLIC_KEY, VAPI_ASSISTANT_ID, CORS_ORIGINS
from models import ConfigResponse
from routes_user import api_router_user
from routes_interview import api_router_interview
from routes_auth import api_router_auth

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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

