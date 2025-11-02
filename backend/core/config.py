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

FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    # если появится свой прод-домен фронта — добавишь сюда
]

# Разрешаем ВСЕ деплойные поддомены Cloudflare Pages проекта
ALLOWED_PAGES_REGEX = r"^https://[a-z0-9-]+\.ad-dash\.pages\.dev$"

# --- Client Specific Data ---
CLIENT_AVATARS = {
    "act_284902192299330": "https://video.karal.az/avatars/ahadnazim.jpg"
}

# core/config.py
FRONTEND_ORIGINS = [
    "https://bd237748.ad-dash.pages.dev",
    "http://localhost:3000",
]

# Try multiple possible database URL variables for Railway
DATABASE_URL = (
    os.getenv("DATABASE_URL") or 
    os.getenv("DATABASE_PUBLIC_URL") or 
    os.getenv("RAILWAY_DATABASE_URL") or 
    os.getenv("POSTGRES_URL") or 
    os.getenv("POSTGRES_PRIVATE_URL") or
    "sqlite:///./ad_dash.db"  # fallback to SQLite
)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "K6787326###1gHjTrA") # Замени на сложный ключ
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 # 24 часа

# Debug info
logging.info(f"DATABASE_URL: {DATABASE_URL}")
logging.info(f"DATABASE_PUBLIC_URL: {os.getenv('DATABASE_PUBLIC_URL')}")
logging.info(f"DATABASE_URL env: {os.getenv('DATABASE_URL')}")
