from dotenv import load_dotenv
from supabase import create_client, Client as SupabaseClient
import os
import logging
from pathlib import Path
from typing import Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

supabase: Optional[SupabaseClient] = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

CLERK_SECRET_KEY = os.environ.get('CLERK_SECRET_KEY', '')
CLERK_JWT_ISSUER = os.environ.get('CLERK_JWT_ISSUER', '')

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-oss-20b:free')
VAPI_PUBLIC_KEY = os.environ.get('VAPI_PUBLIC_KEY', '')
VAPI_ASSISTANT_ID = os.environ.get('VAPI_ASSISTANT_ID', '')
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
