# --- main_backend.py ---

import os
import asyncio
import aiohttp
import json
from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 1. Конфигурация ---
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN") # Убедитесь, что этот ключ есть в переменных на Railway
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

# --- 2. Инициализация FastAPI ---
app = FastAPI()

# Разрешаем фронтенду (вашему дэшборду) обращаться к нашему бэкенду
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Для простоты разрешаем все источники
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. ВАША ЛОГИКА ИЗ СТАРЫХ ФАЙЛОВ ---
# Эти функции мы берем из вашего проекта target_tg-main. Они уже умеют получать данные.

async def fb_get(session: aiohttp.ClientSession, url: str, params: dict = None):
    """Асинхронная функция для выполнения GET-запросов к Graph API."""
    params = params or {}
    params["access_token"] = META_TOKEN
    async with session.get(url, params=params) as response:
        response.raise_for_status()
        return await response.json()

async def get_ad_accounts(session: aiohttp.ClientSession):
    """Получает список рекламных аккаунтов."""
    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"fields": "name,account_id"}
    data = await fb_get(session, url, params)
    return data.get("data", [])

async def get_insights_for_account(session: aiohttp.ClientSession, account_id: str):
    """Получает статистику по активным кампаниям для одного аккаунта."""
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {
        "fields": "campaign_id,campaign_name,spend,actions,objective",
        "level": "campaign",
        "filtering": f'[{{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}}]',
        "date_preset": "today", # Получаем данные за сегодня
        "limit": 500
    }
    data = await fb_get(session, url, params=params)
    return data.get("data", [])


# --- 4. ГЛАВНАЯ ТОЧКА ДОСТУПА (API Endpoint) ---
# Когда ваш дэшборд сделает запрос на /api/active-campaigns, выполнится эта функция

@app.get("/api/active-campaigns")
async def get_all_active_campaigns():
    all_campaigns_data = []
    timeout = aiohttp.ClientTimeout(total=180)

    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            accounts = await get_ad_accounts(session)
            if not accounts:
                return [] # Возвращаем пустой список, если аккаунтов нет

            # Для каждого аккаунта запрашиваем его статистику
            for acc in accounts:
                insights = await get_insights_for_account(session, acc['account_id'])

                for campaign in insights:
                    spend = float(campaign.get("spend", 0))
                    if spend == 0:
                        continue # Пропускаем кампании без расхода

                    leads = sum(int(a["value"]) for a in campaign.get("actions", []) if a.get("action_type") == LEAD_ACTION_TYPE)
                    cpl = (spend / leads) if leads > 0 else 0

                    # Формируем красивый объект с данными для фронтенда
                    all_campaigns_data.append({
                        "account_name": acc['name'],
                        "campaign_name": campaign.get('campaign_name', 'N/A'),
                        "objective": campaign.get('objective', 'N/A').replace('_', ' ').capitalize(),
                        "status": "ACTIVE", # Мы уже отфильтровали по активным
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl
                    })

    except aiohttp.ClientResponseError as e:
        print(f"Ошибка API Facebook: {e.status} - {e.message}")
        return {"error": f"Ошибка API Facebook: {e.message}"}
    except Exception as e:
        print(f"Произошла ошибка: {e}")
        return {"error": f"Произошла внутренняя ошибка сервера: {str(e)}"}
    
    return all_campaigns_data