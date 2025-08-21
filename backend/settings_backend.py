# settings_backend.py
import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# --- Config ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
load_dotenv()

# Railway → Config Vars: DATABASE_URL (postgres), FRONTEND_ORIGIN (optional)
DATABASE_URL = os.getenv("DATABASE_URL")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

if not DATABASE_URL:
  raise RuntimeError("DATABASE_URL is not set. Provide a PostgreSQL URL in Railway.")

app = FastAPI()
app.add_middleware(
  CORSMiddleware,
  allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "https://ad-dash-frontend-production.up.railway.app"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# --- DB ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class AvatarSetting(Base):
  __tablename__ = "avatar_settings"
  id = Column(Integer, primary_key=True, index=True)
  account_id = Column(String, unique=True, index=True, nullable=False)  # допускаем имя аккаунта как ключ
  image_url = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

# --- Endpoints ---
@app.get("/api/settings/avatars")
def get_avatars(db: Session = Depends(get_db)) -> List[Dict]:
  rows = db.query(AvatarSetting).all()
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
