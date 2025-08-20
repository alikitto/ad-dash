# --- main_backend.py (Версия 2.0 с расширенными данными и управлением) ---

import os
import asyncio
import aiohttp
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

# --- Конфигурация ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

# --- Аватарки клиентов ---
# Ключ - ID рекламного аккаунта (без "act_"), значение - URL картинки
# ЗАМЕНИТЕ ЭТИ ДАННЫЕ НА ВАШИ РЕАЛЬНЫЕ
client_avatars = {
    "123456789012345": "https://video.karal.az/avatars/ahadnazim.jpg",
    "284902192299330": "https://video.karal.az/avatars/gf-diamonds.png",
    "803281386353042": "https://video.karal.az/avatars/gf.jpg",
}

# --- Инициализация FastAPI ---
app = FastAPI()

# Укажите точный URL вашего фронтенда
origins = [
    "https://ad-dash-frontend-production.up.railway.app", # ЗАМЕНИТЕ НА ВАШ URL ФРОНТЕНДА
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Функции для работы с Meta API ---
async def fb_request(session: aiohttp.ClientSession, method: str, url: str, params: dict = None, data: dict = None):
    """Универсальная функция для GET и POST запросов."""
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

async def get_campaigns_statuses(session: aiohttp.ClientSession, account_id: str):
    """Получает ID и статусы всех кампаний в аккаунте."""
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/campaigns"
    params = {"fields": "id,effective_status", "limit": 500}
    response = await fb_request(session, "get", url, params=params)
    # Преобразуем в удобный словарь: {campaign_id: status}
    return {campaign['id']: campaign['effective_status'] for campaign in response.get("data", [])}


async def get_insights_for_account(session: aiohttp.ClientSession, account_id: str):
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    # РАСШИРЕННЫЙ СПИСОК ПОЛЕЙ
    params = {
        "fields": "campaign_id,campaign_name,spend,actions,objective,cpm,ctr,inline_link_ctr,clicks,cpc",
        "level": "campaign",
        "date_preset": "last_7d",
        "limit": 500
    }
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

# --- Эндпоинты API ---

@app.get("/api/active-campaigns")
async def get_all_active_campaigns():
    if not META_TOKEN:
        logging.error("!!! Токен META_ACCESS_TOKEN не найден !!!")
        raise HTTPException(status_code=500, detail="Token not configured on the server")

    all_campaigns_data = []
    timeout = aiohttp.ClientTimeout(total=180)
    
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            accounts = await get_ad_accounts(session)
            if not accounts: return []

            for acc in accounts:
                account_id_numeric = acc['account_id'].replace('act_', '')
                statuses = await get_campaigns_statuses(session, acc['account_id'])
                insights = await get_insights_for_account(session, acc['account_id'])

                for campaign in insights:
                    spend = float(campaign.get("spend", 0))
                    
                    # Получаем CPA и CPL из поля actions
                    leads = sum(int(a["value"]) for a in campaign.get("actions", []) if a.get("action_type") == LEAD_ACTION_TYPE)
                    purchases = sum(int(a["value"]) for a in campaign.get("actions", []) if "purchase" in a.get("action_type", ""))
                    
                    cpl = (spend / leads) if leads > 0 else 0
                    cpa = (spend / purchases) if purchases > 0 else 0

                    all_campaigns_data.append({
                        "account_name": acc['name'],
                        "avatarUrl": client_avatars.get(account_id_numeric, ""), # Добавляем аватар
                        "campaign_id": campaign.get('campaign_id'),
                        "campaign_name": campaign.get('campaign_name'),
                        "status": statuses.get(campaign.get('campaign_id'), 'UNKNOWN'), # Берем актуальный статус
                        "objective": campaign.get('objective'),
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl,
                        "cpa": cpa,
                        "cpm": float(campaign.get("cpm", 0)),
                        "ctr_all": float(campaign.get("ctr", 0)),
                        "ctr_link_click": float(campaign.get("inline_link_ctr", 0)),
                        "clicks": int(campaign.get("clicks", 0)),
                    })
        
        return all_campaigns_data
    
    except Exception as e:
        logging.error(f"!!! КРИТИЧЕСКАЯ ОШИБКА ВНУТРИ API: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/campaigns/{campaign_id}/update-status")
async def update_campaign_status(campaign_id: str, payload: Dict = Body(...)):
    """Новый эндпоинт для обновления статуса кампании (ACTIVE/PAUSED)."""
    new_status = payload.get("status")
    if new_status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status provided.")

    logging.info(f"--- Попытка изменить статус кампании {campaign_id} на {new_status} ---")
    url = f"https://graph.facebook.com/{API_VERSION}/{campaign_id}"
    data = {"status": new_status}
    
    try:
        timeout = aiohttp.ClientTimeout(total=60)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            response = await fb_request(session, "post", url, data=data)
            logging.info(f"--- Успешный ответ от Meta: {response} ---")
            return response
    except Exception as e:
        logging.error(f"!!! Ошибка при обновлении статуса: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
