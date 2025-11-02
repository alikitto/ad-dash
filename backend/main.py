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


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ad-dash.pages.dev",
        "https://ads-dash.pages.dev",  # НОВЫЙ фронт
    ],
    allow_origin_regex=r"^https://[a-z0-9-]+\.((ad|ads)-dash)\.pages\.dev$",
    allow_credentials=False,   # <— ВАЖНО: выключаем, чтобы можно было ставить * / несколько доменов
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
# Подключаем все эндпоинты из api/endpoints.py с префиксом /api
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the Ad-Dash API!"}
app.include_router(auth_router, prefix="/auth")
app.include_router(user_router, prefix="/users")
