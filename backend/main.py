# backend/main.py

from fastapi import FastAPI
from core.config import FRONTEND_ORIGINS, ALLOWED_PAGES_REGEX
from fastapi.middleware.cors import CORSMiddleware

# Импортируем роутер из нашего нового модуля api
from api.endpoints import router as api_router
from core.config import FRONTEND_ORIGINS
from api.auth_endpoints import router as auth_router
from api.user_endpoints import router as user_router


app = FastAPI(
    title="Ad-Dash Backend API",
    description="API for Meta Ads analysis and automation.",
    version="1.0.0"
)

# --- Middleware ---

# ⛳️ временно максимально широкие CORS, без credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # временно — пустим всех
    allow_credentials=False,      # ВАЖНО: выключено
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/__whoami")
def whoami():
    return {"ok": True, "version": "cors-wide-v1"}

# --- Routers ---
# Подключаем все эндпоинты из api/endpoints.py с префиксом /api
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the Ad-Dash API!"}
app.include_router(auth_router, prefix="/auth")
app.include_router(user_router, prefix="/users")
