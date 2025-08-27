# backend/core/config.py

import os
import logging
from dotenv import load_dotenv

# --- Setup ---
# Убедись, что .env файл лежит в корневой папке проекта или в папке backend
# Если он в корне, используй: load_dotenv(dotenv_path='../.env')
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# --- API Keys & Tokens ---
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# --- Facebook API Constants ---
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

# --- Application Settings ---
FRONTEND_ORIGINS = [
    "https://ad-dash-frontend-production.up.railway.app",
    "http://localhost:3000"
]

# --- Client Specific Data ---
CLIENT_AVATARS = {
    "act_284902192299330": "https://video.karal.az/avatars/ahadnazim.jpg"
}
