# --- main_backend.py (Финальная, упрощенная и надежная версия) ---

import os
import asyncio
import aiohttp
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# --- Конфигурация ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

app = FastAPI()

# Убедитесь, что здесь указан ваш точный URL фронтенда
origins = [
    "https://ad-dash-frontend-production.up.railway.app", # ЗАМЕНИТЕ НА ВАШ URL
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
async def fb_get(session: aiohttp.ClientSession, url: str, params: dict = None):
    params = params or {}
    params["access_token"] = META_TOKEN
    async with session.get(url, params=params) as response:
        response.raise_for_status()
        return await response.json()

async def get_ad_accounts(session: aiohttp.ClientSession):
    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"fields": "name,account_id"}
    data = await fb_get(session, url, params)
    return data.get("data", [])

async def get_insights_for_account(session: aiohttp.ClientSession, account_id: str):
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    # ИЗМЕНЕНИЕ: Используем ваш старый, надежный набор полей, но расширяем дату и статусы
    params = {
        "fields": "campaign_id,campaign_name,spend,actions,objective",
        "level": "campaign",
        "filtering": f'[{{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE", "PAUSED"]}}]',
        "date_preset": "last_7d", # Берем данные за неделю для надежности
        "limit": 500
    }
    data = await fb_get(session, url, params=params)
    return data.get("data", [])

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
            if not accounts:
                return []

            for acc in accounts:
                insights = await get_insights_for_account(session, acc['account_id'])

                for campaign in insights:
                    spend = float(campaign.get("spend", 0))
                    if spend == 0:
                        continue
                    
                    leads = sum(int(a["value"]) for a in campaign.get("actions", []) if a.get("action_type") == LEAD_ACTION_TYPE)
                    cpl = (spend / leads) if leads > 0 else 0
                    
                    all_campaigns_data.append({
                        # Возвращаем только те поля, которые точно есть
                        "account_name": acc['name'],
                        "campaign_name": campaign.get('campaign_name', 'N/A'),
                        "objective": campaign.get('objective', 'N/A'),
                        "status": "ACTIVE", # Временно для простоты
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl
                    })
        
        logging.info(f"--- Успешно собрано данных по {len(all_campaigns_data)} кампаниям ---")
        return all_campaigns_data
    
    except Exception as e:
        logging.error(f"!!! КРИТИЧЕСКАЯ ОШИБКА ВНУТРИ API: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
