# --- main_backend.py ---

import os
import asyncio
import aiohttp
import json
import logging # ИЗМЕНЕНИЕ: Импортируем модуль логирования
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ИЗМЕНЕНИЕ: Настраиваем логирование
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- 1. Конфигурация ---
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

# --- 2. Инициализация FastAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. Функции для работы с Meta API ---
async def fb_get(session: aiohttp.ClientSession, url: str, params: dict = None):
    params = params or {}
    params["access_token"] = META_TOKEN
    async with session.get(url, params=params) as response:
        # Эта строка вызовет ошибку, если запрос к Meta API неудачен (например, из-за токена)
        response.raise_for_status()
        return await response.json()

async def get_ad_accounts(session: aiohttp.ClientSession):
    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"fields": "name,account_id"}
    data = await fb_get(session, url, params)
    return data.get("data", [])

async def get_insights_for_account(session: aiohttp.ClientSession, account_id: str):
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {
        "fields": "campaign_id,campaign_name,spend,actions,objective",
        "level": "campaign",
        "filtering": f'[{{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}}]',
        "date_preset": "today",
        "limit": 500
    }
    data = await fb_get(session, url, params=params)
    return data.get("data", [])

# --- 4. ГЛАВНАЯ ТОЧКА ДОСТУПА С УЛУЧШЕННЫМ ЛОГИРОВАНИЕМ ---
@app.get("/api/active-campaigns")
async def get_all_active_campaigns():
    all_campaigns_data = []
    timeout = aiohttp.ClientTimeout(total=180)

    try:
        logging.info("--- Начинаю сбор данных с Meta API ---")
        async with aiohttp.ClientSession(timeout=timeout) as session:
            accounts = await get_ad_accounts(session)
            if not accounts:
                logging.info("--- Рекламные аккаунты не найдены ---")
                return []

            logging.info(f"--- Найдено аккаунтов: {len(accounts)} ---")

            for acc in accounts:
                logging.info(f"--- Обрабатываю аккаунт: {acc['name']} ---")
                insights = await get_insights_for_account(session, acc['account_id'])

                for campaign in insights:
                    spend = float(campaign.get("spend", 0))
                    if spend == 0:
                        continue
                    
                    leads = sum(int(a["value"]) for a in campaign.get("actions", []) if a.get("action_type") == LEAD_ACTION_TYPE)
                    cpl = (spend / leads) if leads > 0 else 0
                    
                    all_campaigns_data.append({
                        "account_name": acc['name'],
                        "campaign_name": campaign.get('campaign_name', 'N/A'),
                        "objective": campaign.get('objective', 'N/A').replace('_', ' ').capitalize(),
                        "status": "ACTIVE",
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl
                    })
        
        logging.info(f"--- Успешно собрано данных по {len(all_campaigns_data)} кампаниям ---")
        return all_campaigns_data

    except Exception as e:
        # ИЗМЕНЕНИЕ: Используем logging.error для гарантированного вывода ошибки
        logging.error(f"!!! КРИТИЧЕСКАЯ ОШИБКА ВНУТРИ API: {e} !!!", exc_info=True)
        return {"error": f"Internal Server Error: {e}"}
