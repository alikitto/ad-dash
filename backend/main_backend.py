# --- main_backend.py (Версия для проверки токена) ---

import os
import asyncio
import aiohttp
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    params = {
        "fields": "campaign_id,campaign_name,spend,actions,objective",
        "level": "campaign",
        "filtering": f'[{{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}}]',
        "date_preset": "today",
        "limit": 500
    }
    data = await fb_get(session, url, params=params)
    return data.get("data", [])

@app.get("/api/active-campaigns")
async def get_all_active_campaigns():
    # --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    # ⚠️ Важно по безопасности: Мы никогда не выводим в лог полный токен.
    # Только его части для проверки.
    if META_TOKEN:
        logging.info(f"--- Проверка токена. Начало: {META_TOKEN[:5]}, Конец: {META_TOKEN[-5:]} ---")
    else:
        logging.error("!!! Токен META_ACCESS_TOKEN не найден !!!")
        return {"error": "Token not configured on the server"}
    # --- КОНЕЦ ИЗМЕНЕНИЯ ---

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
        logging.error(f"!!! КРИТИЧЕСКАЯ ОШИБКА ВНУТРИ API: {e} !!!", exc_info=True)
        return {"error": f"Internal Server Error: {e}"}
