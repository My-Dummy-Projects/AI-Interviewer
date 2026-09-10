"""Central configuration module for the AI Interviewer backend.

Loads environment variables from ``.env``, configures logging, and
constructs the shared Supabase client used by the rest of the app.
All secrets come from environment variables (never hardcoded).
"""
import os
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client as SupabaseClient

# Load environment variables from the .env file alongside this module.
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Supabase (primary datastore)
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

# Client is created lazily (None if credentials are missing) so the app can
# boot in local/dev modes even before Supabase is provisioned.
supabase: Optional[SupabaseClient] = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------------------------------------------------------------------------
# Clerk (authentication)
# ---------------------------------------------------------------------------
CLERK_JWT_ISSUER = os.environ.get('CLERK_JWT_ISSUER', '')

# ---------------------------------------------------------------------------
# OpenRouter (LLM feedback generation)
# ---------------------------------------------------------------------------
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini')

# ---------------------------------------------------------------------------
# Vapi (realtime voice interviews)
# ---------------------------------------------------------------------------
VAPI_PUBLIC_KEY = os.environ.get('VAPI_PUBLIC_KEY', '')
VAPI_ASSISTANT_ID = os.environ.get('VAPI_ASSISTANT_ID', '')

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Comma-separated list of allowed origins, or "*" to allow any origin.
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

# ---------------------------------------------------------------------------
# Razorpay (payments)
# ---------------------------------------------------------------------------
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')