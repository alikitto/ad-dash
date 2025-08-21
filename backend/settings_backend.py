# settings_backend.py
import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
load_dotenv()

# DB url: Railway sets DATABASE_URL or POSTGRES_URL; normalize scheme
_DB = (
    os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_URL")
    or os.getenv("POSTGRESQL_URL")
)
if _DB and _DB.startswith("postgres://"):
    _DB = _DB.replace("postgres://", "postgresql://", 1)

# Fallback to SQLite for local dev if not set
if not _DB:
    logging.warning("DATABASE_URL not set. Falling back to SQLite ./avatars.db")
    _DB = "sqlite:///./avatars.db"
    _CONNECT_ARGS = {"check_same_thread": False}
else:
    _CONNECT_ARGS = {}

app = FastAPI()

origins = [
    os.getenv("FRONTEND_ORIGIN") or "http://localhost:3000",
    "http://localhost:3000",
    "https://ad-dash-frontend-production.up.railway.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine(_DB, connect_args=_CONNECT_ARGS)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class AvatarSetting(Base):
    __tablename__ = "avatar_settings"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String, unique=True, index=True, nullable=False)
    image_url = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/settings/avatars")
def get_avatars(db: Session = Depends(get_db)) -> List[Dict]:
    rows = db.query(AvatarSetting).all()
    # Возвращаем ARRAY для единообразия
    return [{"account_id": r.account_id, "image_url": r.image_url} for r in rows]

@app.post("/api/settings/avatars")
def upsert_avatar(payload: Dict = Body(...), db: Session = Depends(get_db)) -> Dict:
    account_id = (payload.get("accountId") or "").strip()
    image_url = (payload.get("imageUrl") or "").strip()
    if not account_id or not image_url:
        raise HTTPException(status_code=400, detail="accountId and imageUrl are required")

    row = db.query(AvatarSetting).filter(AvatarSetting.account_id == account_id).first()
    if row:
        row.image_url = image_url
    else:
        row = AvatarSetting(account_id=account_id, image_url=image_url)
        db.add(row)
    db.commit()
    return {"status": "success", "account_id": account_id}

@app.delete("/api/settings/avatars/{account_id}")
def delete_avatar(account_id: str, db: Session = Depends(get_db)) -> Dict:
    row = db.query(AvatarSetting).filter(AvatarSetting.account_id == account_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Avatar not found")
    db.delete(row)
    db.commit()
    return {"status": "success"}
