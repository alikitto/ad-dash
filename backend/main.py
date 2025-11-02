from fastapi import FastAPI, Response, Request
from fastapi.middleware.cors import CORSMiddleware

from api.endpoints import router as api_router
from api.auth_endpoints import router as auth_router
from api.user_endpoints import router as user_router

app = FastAPI(title="Ad-Dash Backend API", version="1.0.0")

# ⛳️ ВРЕМЕННО: максимально широкие CORS (cookies НЕ используем)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,     # ВАЖНО: выключено
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ловим preflight на ВСЕ пути (иногда роутер не даёт 200/204 на OPTIONS)
@app.options("/{full_path:path}")
def preflight_all(full_path: str):
    return Response(status_code=204)

# Диагностика: кто к нам пришёл и какая CORS-конфигурация действует
@app.get("/__cors")
def cors_info(request: Request):
    return {
        "ok": True,
        "applied": "WIDE",
        "origin_header": request.headers.get("origin"),
    }

# Роутеры
app.include_router(auth_router, prefix="/auth")
app.include_router(user_router, prefix="/users")
app.include_router(api_router,  prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.get("/healthz")
def healthz():
    return {"ok": True}
