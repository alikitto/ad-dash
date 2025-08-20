# --- main_backend.py (Версия 5.0 с базой данных) ---
import os
import asyncio
import aiohttp
import json
import logging 
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional

# --- НОВЫЕ ИМПОРТЫ ДЛЯ БАЗЫ ДАННЫХ ---
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# --- Конфигурация ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL") # Railway добавит эту переменную автоматически
API_VERSION = "v19.0"

# --- НАСТРОЙКА БАЗЫ ДАННЫХ ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Модель таблицы для аватарок ---
class AvatarSetting(Base):
    __tablename__ = "avatar_settings"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String, unique=True, index=True, nullable=False)
    image_url = Column(String, nullable=False)

# Создаем таблицу при запуске приложения, если ее нет
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()
# ... (CORS middleware остается без изменений) ...
origins = ["https://ad-dash-frontend-production.up.railway.app", "http://localhost:3000"] # ЗАМЕНИТЕ НА ВАШ URL
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


# ... (fb_request, get_ad_accounts, и другие функции для Meta API остаются без изменений) ...
async def fb_request(session: aiohttp.ClientSession, method: str, url: str, params: dict = None, data: dict = None):
    if params is None: params = {}
    params["access_token"] = META_TOKEN
    async with session.request(method, url, params=params, json=data) as response:
        response.raise_for_status()
        return await response.json()

async def get_ad_accounts(session: aiohttp.ClientSession):
    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"fields": "name,account_id"}
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

async def get_adset_insights_for_account(session: aiohttp.ClientSession, account_id: str, date_preset: str):
    # ... (код этой функции без изменений) ...
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {"fields": "adset_id,adset_name,campaign_name,objective,spend,actions,cpm,ctr,inline_link_ctr,clicks,impressions,frequency,effective_status", "level": "adset", "limit": 500}
    if date_preset != 'maximum': params['date_preset'] = date_preset
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

# --- НОВЫЕ ЭНДПОИНТЫ ДЛЯ НАСТРОЕК ---
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

    # Проверяем, есть ли уже настройка для этого ID
    db_avatar = db.query(AvatarSetting).filter(AvatarSetting.account_id == account_id).first()
    if db_avatar:
        db_avatar.image_url = image_url
    else:
        db_avatar = AvatarSetting(account_id=account_id, image_url=image_url)
        db.add(db_avatar)

    db.commit()
    db.refresh(db_avatar)
    return {"status": "success", "account_id": db_avatar.account_id, "image_url": db_avatar.image_url}

# --- Основной эндпоинт для данных ---
@app.get("/api/adsets")
async def get_all_adsets_data(date_preset: str = Query("last_7d"), db: Session = Depends(get_db)):
    client_avatars = {avatar.account_id: avatar.image_url for avatar in db.query(AvatarSetting).all()}
    # ... (остальной код эндпоинта остается без изменений, но теперь он берет аватарки из client_avatars) ...
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")
    all_adsets_data = []
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            if not accounts: return []

            for acc in accounts:
                insights = await get_adset_insights_for_account(session, acc['account_id'], date_preset)
                for adset in insights:
                    # ... (вся логика обработки данных) ...
                    spend = float(adset.get("spend", 0))
                    leads = sum(int(a["value"]) for a in adset.get("actions", []) if LEAD_ACTION_TYPE in a.get("action_type", ""))
                    purchases = sum(int(a["value"]) for a in adset.get("actions", []) if "purchase" in a.get("action_type", ""))
                    cpl = (spend / leads) if leads > 0 else 0
                    cpa = (spend / purchases) if purchases > 0 else 0
                    all_adsets_data.append({
                        "account_name": acc['name'],
                        "avatarUrl": client_avatars.get(acc['account_id'].replace('act_', ''), ""),
                        "adset_id": adset.get('adset_id'),
                        "adset_name": adset.get('adset_name'),
                        "campaign_name": adset.get('campaign_name'),
                        "status": adset.get('effective_status'),
                        "objective": adset.get("objective", "N/A"),
                        "spend": spend, "leads": leads, "cpl": cpl, "cpa": cpa,
                        "cpm": float(adset.get("cpm", 0)),
                        "ctr_all": float(adset.get("ctr", 0)),
                        "ctr_link_click": float(adset.get("inline_link_ctr", 0)),
                        "clicks": int(adset.get("clicks", 0)),
                        "impressions": int(adset.get("impressions", 0)),
                        "frequency": float(adset.get("frequency", 0)),
                    })
        return all_adsets_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
