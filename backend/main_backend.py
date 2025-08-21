# --- main_backend.py (Final Version with Link Clicks + Ads endpoint) ---

import os
import asyncio
import aiohttp
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"

# lead action, как в твоём коде
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

# аватарки (по желанию)
client_avatars = {
    "act_284902192299330": "https://video.karal.az/avatars/ahadnazim.jpg",
}

app = FastAPI()
origins = [
    "https://ad-dash-frontend-production.up.railway.app",  # твой фронт
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- helpers -----------------

async def fb_request(session: aiohttp.ClientSession, method: str, url: str, params: dict = None, data: dict = None):
    if params is None:
        params = {}
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
        "fields": "adset_id,spend,actions,cpm,ctr,clicks,impressions,frequency,inline_link_clicks",
        "filtering": f'[{{"field":"adset.id","operator":"IN","value":{json.dumps(adset_ids)}}}]',
    }
    # поддержка "maximum" (не ставим date_preset)
    if date_preset != "maximum":
        params["date_preset"] = date_preset

    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

# ---- NEW: данные по объявлениям внутри ad set ----

async def get_ads_metadata(session: aiohttp.ClientSession, adset_id: str):
    """Список объявлений с названием/статусом/миниатюрой (через creative)."""
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/ads"
    params = {
        "fields": "id,name,status,effective_status,creative{thumbnail_url,image_url,video_id,object_story_id,object_story_spec}",
        "limit": 200,
    }
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

async def get_ads_insights(session: aiohttp.ClientSession, adset_id: str, date_preset: str):
    """Инсайты на уровне объявлений для данного ad set."""
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
    params = {
        "level": "ad",
        "fields": "ad_id,spend,impressions,clicks,inline_link_clicks,ctr,cpm,actions",
    }
    if date_preset != "maximum":
        params["date_preset"] = date_preset
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

async def build_ads_payload(session: aiohttp.ClientSession, adset_id: str, date_preset: str):
    """Собираем метаданные + инсайты по каждому объявлению."""
    meta_task = asyncio.create_task(get_ads_metadata(session, adset_id))
    ins_task = asyncio.create_task(get_ads_insights(session, adset_id, date_preset))
    ads_meta, ads_insights = await asyncio.gather(meta_task, ins_task)

    ins_map = {row.get("ad_id"): row for row in ads_insights if row.get("ad_id")}
    items = []

    for ad in ads_meta:
        ad_id = ad.get("id")
        ins = ins_map.get(ad_id, {}) or {}
        spend = float(ins.get("spend", 0) or 0)
        impressions = int(ins.get("impressions", 0) or 0)
        clicks = int(ins.get("clicks", 0) or 0)
        link_clicks = int(ins.get("inline_link_clicks", 0) or 0)
        ctr = float(ins.get("ctr", 0) or 0)
        cpm = float(ins.get("cpm", 0) or 0)

        # leads
        leads = 0
        for a in ins.get("actions", []) or []:
            if LEAD_ACTION_TYPE in a.get("action_type", ""):
                try:
                    leads += int(a.get("value", 0))
                except Exception:
                    pass

        # производные
        cpc = (spend / clicks) if clicks else 0.0
        cpa = (spend / leads) if leads else 0.0
        ctr_link = (link_clicks / impressions * 100.0) if impressions else 0.0

        creative = ad.get("creative") or {}
        thumb = (
            creative.get("thumbnail_url")
            or creative.get("image_url")
            or None
        )

        items.append({
            "ad_id": ad_id,
            "ad_name": ad.get("name"),
            "status": ad.get("status") or ad.get("effective_status"),
            "thumbnail_url": thumb,
            "spend": spend,
            "impressions": impressions,
            "clicks": clicks,
            "link_clicks": link_clicks,
            "ctr": ctr,
            "ctr_link": ctr_link,
            "cpc": cpc,
            "cpm": cpm,
            "leads": leads,
            "cpa": cpa,
        })

    return items

# ----------------- endpoints -----------------

@app.get("/api/adsets")
async def get_all_adsets_data(date_preset: str = Query("last_7d")):
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")

    all_data = []
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            if not accounts:
                return []

            for acc in accounts:
                adsets = await get_all_adsets_from_account(session, acc["account_id"])
                if not adsets:
                    continue

                adset_ids = [adset["id"] for adset in adsets]
                insights = await get_insights_for_adsets(session, acc["account_id"], adset_ids, date_preset)
                insights_map = {item["adset_id"]: item for item in insights}

                for adset in adsets:
                    adset_insight = insights_map.get(adset["id"])
                    if not adset_insight:
                        continue

                    spend = float(adset_insight.get("spend", 0))
                    # leads / purchases из actions
                    leads = sum(
                        int(a.get("value", 0))
                        for a in adset_insight.get("actions", []) or []
                        if LEAD_ACTION_TYPE in a.get("action_type", "")
                    )
                    purchases = sum(
                        int(a.get("value", 0))
                        for a in adset_insight.get("actions", []) or []
                        if "purchase" in a.get("action_type", "")
                    )
                    cpl = (spend / leads) if leads > 0 else 0
                    cpa = (spend / purchases) if purchases > 0 else 0

                    all_data.append({
                        "account_name": acc["name"],
                        "avatarUrl": client_avatars.get(acc["account_id"].replace("act_", ""), ""),
                        "adset_id": adset["id"],
                        "adset_name": adset["name"],
                        "campaign_name": adset.get("campaign", {}).get("name"),
                        "status": adset["effective_status"],
                        "objective": adset.get("campaign", {}).get("objective", "N/A"),
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl,
                        "cpa": cpa,
                        "cpm": float(adset_insight.get("cpm", 0)),
                        "ctr_all": float(adset_insight.get("ctr", 0)),
                        "clicks": int(adset_insight.get("clicks", 0)),
                        "link_clicks": int(adset_insight.get("inline_link_clicks", 0)),
                        "impressions": int(adset_insight.get("impressions", 0)),
                        "frequency": float(adset_insight.get("frequency", 0)),
                    })
        return all_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/adsets/{adset_id}/update-status")
async def update_adset_status(adset_id: str, payload: Dict = Body(...)):
    new_status = payload.get("status")
    if new_status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}"
    data = {"status": new_status}
    try:
        async with aiohttp.ClientSession() as session:
            return await fb_request(session, "post", url, data=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---- NEW: endpoint для раскрывающейся мини-таблицы Ads ----
@app.get("/api/adsets/{adset_id}/ads")
async def get_ads_for_adset(adset_id: str, date_preset: str = Query("last_7d")):
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    try:
        async with aiohttp.ClientSession() as session:
            items = await build_ads_payload(session, adset_id, date_preset)
            return items
    except Exception as e:
        logging.error(f"!!! ADS API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
