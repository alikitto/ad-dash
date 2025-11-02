# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import FRONTEND_ORIGINS, ALLOWED_PAGES_REGEX
from api.endpoints import router as api_router
from api.auth_endpoints import router as auth_router
from api.user_endpoints import router as user_router

app = FastAPI(
    title="Ad-Dash Backend API",
    version="1.0.0",
    description="API for Meta Ads analysis and automation.",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,      # точные домены
    allow_origin_regex=ALLOWED_PAGES_REGEX,  # превью-домены Cloudflare
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth_router, prefix="/auth")
app.include_router(user_router, prefix="/users")
app.include_router(api_router,  prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the Ad-Dash API!"}

@app.get("/healthz")
def healthz():
    return {"ok": True}
