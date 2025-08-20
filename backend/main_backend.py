# --- main_backend.py (Финальная версия с логикой бота) ---

import os
import asyncio
import aiohttp
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# --- Конфигурация ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"

app = FastAPI()

origins = [
    "https://ad-dash-frontend-production.up.railway.app", # ЗАМЕНИТЕ НА ВАШ URL
    "http://localhost:3000",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Функции API ---
async def fb_get(session: aiohttp.ClientSession, url: str, params: dict = None):
    params = params or {}
    params["access_token"] = META_TOKEN
    async with session.get(url, params=params) as response:
        response.raise_for_status()
        return await response.json()

async def get_ad_accounts(session: aiohttp.ClientSession):
    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"fields": "name,account_id"}
    return (await fb_get(session, url, params)).get("data", [])

async def get_all_adsets(session: aiohttp.ClientSession, account_id: str):
    """НОВАЯ ФУНКЦИЯ: Получает все группы и их статусы."""
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/adsets"
    params = {"fields": "id,name,campaign{name},effective_status", "limit": 500}
    return (await fb_get(session, url, params)).get("data", [])

async def get_insights_for_adsets(session: aiohttp.ClientSession, account_id: str, adset_ids: list):
    """Получает статистику для конкретных групп."""
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {
        "level": "adset",
        "fields": "adset_id,spend,actions,cpm,ctr,clicks",
        "filtering": f'[{{"field":"adset.id","operator":"IN","value":{adset_ids}}}]',
        "date_preset": "last_7d",
    }
    return (await fb_get(session, url, params)).get("data", [])

# --- Главный эндпоинт ---
@app.get("/api/adsets")
async def get_all_adsets_data():
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")

    all_data = []
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            for acc in accounts:
                adsets = await get_all_adsets(session, acc['account_id'])
                if not adsets:
                    continue

                adset_ids = [adset['id'] for adset in adsets]
                insights = await get_insights_for_adsets(session, acc['account_id'], adset_ids)
                
                # Преобразуем статистику в словарь для удобного доступа
                insights_map = {item['adset_id']: item for item in insights}

                # Объединяем данные
                for adset in adsets:
                    adset_insight = insights_map.get(adset['id'])
                    if not adset_insight or float(adset_insight.get("spend", 0)) == 0:
                        continue

                    spend = float(adset_insight.get("spend", 0))
                    leads = sum(int(a["value"]) for a in adset_insight.get("actions", []) if "lead" in a.get("action_type", ""))
                    purchases = sum(int(a["value"]) for a in adset_insight.get("actions", []) if "purchase" in a.get("action_type", ""))
                    cpl = (spend / leads) if leads > 0 else 0
                    cpa = (spend / purchases) if purchases > 0 else 0

                    all_data.append({
                        "account_name": acc['name'],
                        "adset_id": adset['id'],
                        "adset_name": adset['name'],
                        "campaign_name": adset.get('campaign', {}).get('name'),
                        "status": adset['effective_status'],
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl,
                        "cpa": cpa,
                        "cpm": float(adset_insight.get("cpm", 0)),
                        "ctr": float(adset_insight.get("ctr", 0)),
                        "clicks": int(adset_insight.get("clicks", 0)),
                    })
        return all_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
