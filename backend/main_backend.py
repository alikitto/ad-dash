# --- main_backend.py (Финальная версия 2.0) ---

import os
import asyncio
import aiohttp
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"
client_avatars = {}

app = FastAPI()
origins = [
    "https://ad-dash-frontend-production.up.railway.app", # ЗАМЕНИТЕ НА ВАШ URL
    "http://localhost:3000",
]
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

async def get_all_adsets_from_account(session: aiohttp.ClientSession, account_id: str):
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/adsets"
    params = {"fields": "id,name,campaign{name,objective},effective_status", "limit": 500}
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

async def get_insights_for_adsets(session: aiohttp.ClientSession, account_id: str, adset_ids: list, date_preset: str):
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {
        "level": "adset",
        "fields": "adset_id,spend,actions,cpm,ctr,inline_link_clicks,clicks,impressions,frequency",
        "filtering": f'[{{"field":"adset.id","operator":"IN","value":{json.dumps(adset_ids)}}}]',
        "date_preset": date_preset,
    }
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

@app.get("/api/adsets")
async def get_all_adsets_data(date_preset: str = Query("last_7d")):
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")

    all_data = []
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            if not accounts: return []

            for acc in accounts:
                adsets = await get_all_adsets_from_account(session, acc['account_id'])
                if not adsets: continue

                adset_ids = [adset['id'] for adset in adsets]
                insights = await get_insights_for_adsets(session, acc['account_id'], adset_ids, date_preset)
                insights_map = {item['adset_id']: item for item in insights}

                for adset in adsets:
                    adset_insight = insights_map.get(adset['id'])
                    if not adset_insight: continue

                    spend = float(adset_insight.get("spend", 0))
                    leads = sum(int(a["value"]) for a in adset_insight.get("actions", []) if LEAD_ACTION_TYPE in a.get("action_type", ""))
                    purchases = sum(int(a["value"]) for a in adset_insight.get("actions", []) if "purchase" in a.get("action_type", ""))
                    cpl = (spend / leads) if leads > 0 else 0
                    cpa = (spend / purchases) if purchases > 0 else 0

                    all_data.append({
                        "account_name": acc['name'],
                        "avatarUrl": client_avatars.get(acc['account_id'].replace('act_', ''), ""),
                        "adset_id": adset['id'],
                        "adset_name": adset['name'],
                        "campaign_name": adset.get('campaign', {}).get('name'),
                        "status": adset['effective_status'],
                        "objective": adset.get('objective', "N/A"),
                        "spend": spend, "leads": leads, "cpl": cpl, "cpa": cpa,
                        "cpm": float(adset_insight.get("cpm", 0)),
                        "ctr_all": float(adset_insight.get("ctr", 0)),
                        "link_clicks": int(adset_insight.get("inline_link_clicks", 0)),
                        "impressions": int(adset_insight.get("impressions", 0)),
                        "frequency": float(adset_insight.get("frequency", 0)),
                        "clicks": int(adset_insight.get("clicks", 0)),
                    })
        return all_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/adsets/{adset_id}/update-status")
# ... (этот эндпоинт остается без изменений) ...
async def update_adset_status(adset_id: str, payload: Dict = Body(...)):
    new_status = payload.get("status")
    if new_status not in ["ACTIVE", "PAUSED"]: raise HTTPException(status_code=400, detail="Invalid status")
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}"
    data = {"status": new_status}
    try:
        async with aiohttp.ClientSession() as session:
            return await fb_request(session, "post", url, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
