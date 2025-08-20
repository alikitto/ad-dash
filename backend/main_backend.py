# --- main_backend.py (Финальная версия 4.1) ---
import os
import asyncio
import aiohttp
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

# ЗАМЕНИТЕ ID ВАШИХ КЛИЕНТОВ И URL НА АВАТАРКИ
client_avatars = {
    "123456789": "https://i.imgur.com/avatar1.png", 
}

app = FastAPI()
origins = ["https://ad-dash-frontend-production.up.railway.app", "http://localhost:3000"] # ЗАМЕНИТЕ НА ВАШ URL
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

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
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {
        "fields": "adset_id,adset_name,campaign_name,objective,spend,actions,cpm,ctr,inline_link_ctr,clicks,impressions,frequency,effective_status",
        "level": "adset",
        "date_preset": date_preset,
        "limit": 500
    }
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

@app.post("/api/adsets/{adset_id}/update-status")
async def update_adset_status(adset_id: str, payload: Dict = Body(...)):
    new_status = payload.get("status")
    if new_status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status provided.")
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}"
    data = {"status": new_status}
    try:
        async with aiohttp.ClientSession() as session:
            response = await fb_request(session, "post", url, data=data)
            return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/adsets")
async def get_all_adsets(date_preset: str = Query("last_7d")):
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")
    all_adsets_data = []
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            if not accounts: return []

            for acc in accounts:
                insights = await get_adset_insights_for_account(session, acc['account_id'], date_preset)
                for adset in insights:
                    spend = float(adset.get("spend", 0))
                    if spend == 0 and date_preset == 'today': continue
                    
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
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl,
                        "cpa": cpa,
                        "cpm": float(adset.get("cpm", 0)),
                        "ctr_all": float(adset.get("ctr", 0)),
                        "ctr_link_click": float(adset.get("inline_link_ctr", 0)),
                        "clicks": int(adset.get("clicks", 0)),
                        "impressions": int(adset.get("impressions", 0)),
                        "frequency": float(adset.get("frequency", 0)),
                    })
        return all_adsets_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
