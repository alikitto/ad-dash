# --- main_backend.py (Финальная надежная версия) ---

import os
import asyncio
import aiohttp
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

app = FastAPI()

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
    # ИСПОЛЬЗУЕМ ПРОСТОЙ И НАДЕЖНЫЙ НАБОР ПОЛЕЙ
    params = {
        "fields": "campaign_id,campaign_name,spend,actions,objective,status",
        "level": "campaign",
        "date_preset": "last_7d",
        "limit": 500
    }
    data = await fb_get(session, url, params)
    return data.get("data", [])

@app.get("/api/active-campaigns")
async def get_all_active_campaigns():
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")

    all_campaigns_data = []
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            if not accounts: return []

            for acc in accounts:
                insights = await get_insights_for_account(session, acc['account_id'])
                for campaign in insights:
                    spend = float(campaign.get("spend", 0))
                    if spend == 0: continue
                    
                    leads = sum(int(a["value"]) for a in campaign.get("actions", []) if a.get("action_type") == LEAD_ACTION_TYPE)
                    cpl = (spend / leads) if leads > 0 else 0
                    
                    all_campaigns_data.append({
                        "account_name": acc['name'],
                        "campaign_id": campaign.get('campaign_id'),
                        "campaign_name": campaign.get('campaign_name'),
                        "objective": campaign.get('objective'),
                        "status": campaign.get('status'),
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl
                    })
        logging.info(f"--- Successfully collected data for {len(all_campaigns_data)} campaigns ---")
        return all_campaigns_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
