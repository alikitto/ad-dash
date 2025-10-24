# --- Файл: backend/settings_backend.py ---

import os
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# --- Конфигурация ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()
origins = ["https://ad-dash-frontend-production.up.railway.app", "http://localhost:3000"] # ЗАМЕНИТЕ НА ВАШ URL
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Настройка Базы Данных ---
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Please connect a database service.")

engine = create_engine(DATABASE_URL)
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

# --- Эндпоинты для Настроек Аватарок ---
@app.get("/api/settings/avatars")
def get_avatars(db: Session = Depends(get_db)):
    avatars = db.query(AvatarSetting).all()
    return {avatar.account_id: avatar.image_url for avatar in avatars}

@app.post("/api/settings/avatars")
def save_avatar(payload: Dict = Body(...), db: Session = Depends(get_db)):
    account_id = payload.get("accountId")
    image_url = payload.get("imageUrl")
    if not account_id or not image_url:
        raise HTTPException(status_code=400, detail="accountId and imageUrl are required")

    db_avatar = db.query(AvatarSetting).filter(AvatarSetting.account_id == account_id).first()
    if db_avatar:
        db_avatar.image_url = image_url
    else:
        db_avatar = AvatarSetting(account_id=account_id, image_url=image_url)
        db.add(db_avatar)

    db.commit()
    db.refresh(db_avatar)
    return {"status": "success", "account_id": db_avatar.account_id}

@app.delete("/api/settings/avatars/{account_id}")
def delete_avatar(account_id: str, db: Session = Depends(get_db)):
    db_avatar = db.query(AvatarSetting).filter(AvatarSetting.account_id == account_id).first()
    if db_avatar:
        db.delete(db_avatar)
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Avatar not found")
