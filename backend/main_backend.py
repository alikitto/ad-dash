# --- main_backend.py (Full) ---

import os
import asyncio
import aiohttp
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
load_dotenv()

META_TOKEN = os.getenv("META_ACCESS_TOKEN")
if not META_TOKEN:
    logging.warning("META_ACCESS_TOKEN is not set in environment!")

API_VERSION = "v19.0"

# какой action считать «лидом»
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

# аватарки для аккаунтов: ключ — account_id (число или 'act_...') либо имя аккаунта
client_avatars: Dict[str, str] = {
    "act_284902192299330": "https://video.karal.az/avatars/ahadnazim.jpg",
    # "284902192299330": "https://.../same.jpg",        # можешь дублировать как numeric
    # "My Business Manager": "https://.../brand.png",   # или по имени
}

# фронтенд-ориджины
FRONTEND_ORIGINS = [
    "https://ad-dash-frontend-production.up.railway.app",
    "http://localhost:3000",
]

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# FB API helpers
# ──────────────────────────────────────────────────────────────────────────────

async def fb_request(
    session: aiohttp.ClientSession, method: str, url: str, params: dict = None, data: dict = None
):
    if params is None:
        params = {}
    params["access_token"] = META_TOKEN
    async with session.request(method, url, params=params, json=data) as response:
        # поднимем исключение если код не 2xx, чтобы поймать в try/except
        response.raise_for_status()
        return await response.json()

async def get_ad_accounts(session: aiohttp.ClientSession) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"fields": "name,account_id"}  # account_id приходит числом-строкой
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", []) or []

async def get_all_adsets_from_account(session: aiohttp.ClientSession, account_id: str) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/adsets"
    params = {
        "fields": "id,name,campaign{name,objective},effective_status",
        "limit": 500,
    }
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", []) or []

async def get_insights_for_adsets(
    session: aiohttp.ClientSession, account_id: str, adset_ids: list, date_preset: str
) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {
        "level": "adset",
        "fields": "adset_id,spend,actions,cpm,ctr,clicks,impressions,frequency,inline_link_clicks",
        "filtering": f'[{{"field":"adset.id","operator":"IN","value":{json.dumps(adset_ids)}}}]',
        "limit": 5000,
    }
    # поддержка "maximum": не передаём date_preset вовсе
    if date_preset != "maximum":
        params["date_preset"] = date_preset

    response = await fb_request(session, "get", url, params=params)
    return response.get("data", []) or []

# ── Ads (внутри adset) ───────────────────────────────────────────────────────

async def get_ads_metadata(session: aiohttp.ClientSession, adset_id: str) -> List[dict]:
    """Метаданные объявлений: id, name, status + миниатюра из creative."""
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/ads"
    params = {
        "fields": "id,name,status,effective_status,creative{thumbnail_url,image_url,video_id,object_story_id,object_story_spec}",
        "limit": 200,
    }
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", []) or []

async def get_ads_insights(session: aiohttp.ClientSession, adset_id: str, date_preset: str) -> List[dict]:
    """Инсайты по объявлениям (level=ad)."""
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
    params = {
        "level": "ad",
        "fields": "ad_id,spend,impressions,clicks,inline_link_clicks,ctr,cpm,frequency,actions",
        "limit": 5000,
    }
    if date_preset != "maximum":
        params["date_preset"] = date_preset
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", []) or []

async def build_ads_payload(session: aiohttp.ClientSession, adset_id: str, date_preset: str) -> List[dict]:
    """Сшиваем метаданные + инсайты для каждого объявления; считаем производные метрики."""
    meta_task = asyncio.create_task(get_ads_metadata(session, adset_id))
    ins_task = asyncio.create_task(get_ads_insights(session, adset_id, date_preset))
    ads_meta, ads_insights = await asyncio.gather(meta_task, ins_task)

    ins_map = {row.get("ad_id"): row for row in ads_insights if row.get("ad_id")}
    items: List[dict] = []

    for ad in ads_meta:
        ad_id = ad.get("id")
        ins = ins_map.get(ad_id, {}) or {}

        spend = float(ins.get("spend", 0) or 0)
        impressions = int(ins.get("impressions", 0) or 0)
        clicks = int(ins.get("clicks", 0) or 0)
        link_clicks = int(ins.get("inline_link_clicks", 0) or 0)
        ctr_all = float(ins.get("ctr", 0) or 0)          # в %
        cpm = float(ins.get("cpm", 0) or 0)
        frequency = float(ins.get("frequency", 0) or 0)

        # leads из actions
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
        thumb = creative.get("thumbnail_url") or creative.get("image_url") or None

        items.append(
            {
                "ad_id": ad_id,
                "ad_name": ad.get("name"),
                "status": ad.get("status") or ad.get("effective_status"),
                "thumbnail_url": thumb,
                "spend": spend,
                "impressions": impressions,
                "clicks": clicks,
                "link_clicks": link_clicks,
                "ctr": ctr_all,           # %
                "ctr_link": ctr_link,     # %
                "cpc": cpc,
                "cpm": cpm,
                "frequency": frequency,
                "leads": leads,
                "cpa": cpa,
            }
        )

    return items

# ──────────────────────────────────────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────────────────────────────────────

def resolve_avatar_url(account_id: str, account_name: Optional[str]) -> str:
    """Возвращает URL аватарки по account_id (и 'act_{id}') либо по имени."""
    if not account_id and not account_name:
        return ""
    # пробуем numeric id
    if account_id and client_avatars.get(account_id):
        return client_avatars[account_id]
    # пробуем с префиксом act_
    act_key = f"act_{account_id}" if account_id else None
    if act_key and client_avatars.get(act_key):
        return client_avatars[act_key]
    # имя аккаунта
    if account_name and client_avatars.get(account_name):
        return client_avatars[account_name]
    return ""

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/api/adsets")
async def get_all_adsets_data(date_preset: str = Query("last_7d")):
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")

    all_data: List[dict] = []
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            if not accounts:
                return []

            for acc in accounts:
                acc_name = acc.get("name")
                acc_id = acc.get("account_id")  # numeric string
                if not acc_id:
                    continue

                adsets = await get_all_adsets_from_account(session, acc_id)
                if not adsets:
                    continue

                adset_ids = [a["id"] for a in adsets]
                insights = await get_insights_for_adsets(session, acc_id, adset_ids, date_preset)
                insights_map = {row["adset_id"]: row for row in insights}

                for adset in adsets:
                    ins = insights_map.get(adset["id"])
                    if not ins:
                        continue

                    spend = float(ins.get("spend", 0) or 0)

                    # leads / purchases из actions
                    leads = 0
                    purchases = 0
                    for a in ins.get("actions", []) or []:
                        at = a.get("action_type", "") or ""
                        val = int(a.get("value", 0) or 0)
                        if LEAD_ACTION_TYPE in at:
                            leads += val
                        if "purchase" in at:
                            purchases += val

                    cpl = (spend / leads) if leads > 0 else 0.0
                    cpa = (spend / purchases) if purchases > 0 else 0.0

                    # avatar
                    avatar_url = resolve_avatar_url(acc_id, acc_name)

                    all_data.append(
                        {
                            "account_name": acc_name,
                            "avatarUrl": avatar_url,
                            "adset_id": adset["id"],
                            "adset_name": adset.get("name"),
                            "campaign_name": (adset.get("campaign") or {}).get("name"),
                            "status": adset.get("effective_status"),
                            "objective": (adset.get("campaign") or {}).get("objective", "N/A"),
                            "spend": spend,
                            "leads": leads,
                            "cpl": cpl,
                            "cpa": cpa,
                            "cpm": float(ins.get("cpm", 0) or 0),
                            "ctr_all": float(ins.get("ctr", 0) or 0),  # %
                            "clicks": int(ins.get("clicks", 0) or 0),
                            "link_clicks": int(ins.get("inline_link_clicks", 0) or 0),
                            "impressions": int(ins.get("impressions", 0) or 0),
                            "frequency": float(ins.get("frequency", 0) or 0),
                        }
                    )
        return all_data

    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/adsets/{adset_id}/update-status")
async def update_adset_status(adset_id: str, payload: Dict = Body(...)):
    new_status = (payload or {}).get("status")
    if new_status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}"
    data = {"status": new_status}
    try:
        async with aiohttp.ClientSession() as session:
            return await fb_request(session, "post", url, data=data)
    except Exception as e:
        logging.error(f"update_adset_status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# ── раскрывающаяся подтаблица объявлений ──────────────────────────────────────
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

# ── тумблер статуса для объявления ────────────────────────────────────────────
@app.post("/api/ads/{ad_id}/update-status")
async def update_ad_status(ad_id: str, payload: Dict = Body(...)):
    new_status = (payload or {}).get("status")
    if new_status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    url = f"https://graph.facebook.com/{API_VERSION}/{ad_id}"
    data = {"status": new_status}
    try:
        async with aiohttp.ClientSession() as session:
            return await fb_request(session, "post", url, data=data)
    except Exception as e:
        logging.error(f"update_ad_status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
