# --- main_backend.py (Full Corrected Version) ---

import os
import asyncio
import aiohttp
import json
import logging
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
from pydantic import BaseModel
import openai

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY: openai.api_key = OPENAI_API_KEY
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"
client_avatars: Dict[str, str] = {"act_284902192299330": "https://video.karal.az/avatars/ahadnazim.jpg"}
FRONTEND_ORIGINS = ["https://ad-dash-frontend-production.up.railway.app", "http://localhost:3000"]
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=FRONTEND_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class AdSetPayload(BaseModel):
    adset: dict

# ──────────────────────────────────────────────────────────────────────────────
# FB API Helpers & Data Builders
# ──────────────────────────────────────────────────────────────────────────────
async def fb_request(session: aiohttp.ClientSession, method: str, url: str, params: dict = None, data: dict = None):
    if params is None: params = {}
    params["access_token"] = META_TOKEN
    async with session.request(method, url, params=params, json=data) as response:
        response.raise_for_status()
        return await response.json()

async def get_ad_accounts(session: aiohttp.ClientSession) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"fields": "name,account_id"}
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_all_adsets_from_account(session: aiohttp.ClientSession, account_id: str) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/adsets"
    params = {"fields": "id,name,campaign{name,objective},effective_status", "limit": 500}
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_insights_for_adsets(session: aiohttp.ClientSession, account_id: str, adset_ids: list, date_preset: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    filtering_object = [{"field": "adset.id", "operator": "IN", "value": adset_ids}]
    params = {
        "level":"adset",
        "fields":"adset_id,spend,actions,cpm,ctr,clicks,impressions,frequency,inline_link_clicks",
        "filtering": json.dumps(filtering_object, separators=(',', ':')),
        "limit":5000
    }
    
    if start_date and end_date:
        params["time_range"] = f'{{"since":"{start_date}","until":"{end_date}"}}'
    elif date_preset == "maximum":
        today_str = datetime.now().strftime('%Y-%m-%d')
        # --- ИЗМЕНЕНИЕ №1: Новая дата начала для "Максимум" ---
        params["time_range"] = f'{{"since":"2025-06-01","until":"{today_str}"}}'
    else:
        params["date_preset"] = date_preset
        
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_ads_metadata(session: aiohttp.ClientSession, adset_id: str) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/ads"
    params = {"fields": "id,name,status,effective_status,creative{thumbnail_url,image_url}", "limit": 200}
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_ads_insights(session: aiohttp.ClientSession, adset_id: str, date_preset: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
    params = {"level":"ad", "fields":"ad_id,spend,impressions,clicks,inline_link_clicks,ctr,cpm,frequency,actions", "limit":5000}
    
    if start_date and end_date:
        params["time_range"] = f'{{"since":"{start_date}","until":"{end_date}"}}'
    elif date_preset == "maximum":
        today_str = datetime.now().strftime('%Y-%m-%d')
        # --- ИЗМЕНЕНИЕ №1: Новая дата начала для "Максимум" ---
        params["time_range"] = f'{{"since":"2025-06-01","until":"{today_str}"}}'
    else:
        params["date_preset"] = date_preset

    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def build_ads_payload(session: aiohttp.ClientSession, adset_id: str, date_preset: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
    ads_meta, ads_insights = await asyncio.gather(
        get_ads_metadata(session, adset_id), 
        get_ads_insights(session, adset_id, date_preset, start_date, end_date)
    )
    ins_map, items = {row.get("ad_id"): row for row in ads_insights if row.get("ad_id")}, []
    for ad in ads_meta:
        ins = ins_map.get(ad.get("id"), {}) or {}
        spend = safe_float(ins.get("spend",0))
        impressions = int(safe_float(ins.get("impressions",0)))
        link_clicks = int(safe_float(ins.get("inline_link_clicks",0)))
        leads = sum(int(safe_float(a.get("value",0))) for a in ins.get("actions",[])or[] if LEAD_ACTION_TYPE in a.get("action_type",""))
        items.append({"ad_id":ad.get("id"), "ad_name":ad.get("name"), "status":ad.get("status")or ad.get("effective_status"), "thumbnail_url":(ad.get("creative")or{}).get("thumbnail_url")or(ad.get("creative")or{}).get("image_url"), "spend":spend, "impressions":impressions, "link_clicks":link_clicks, "leads":leads, "cpa":(spend/leads) if leads else 0.0, "ctr_link":(link_clicks/impressions*100.0) if impressions else 0.0, "ctr":safe_float(ins.get("ctr",0)), "cpm":safe_float(ins.get("cpm",0)), "frequency":safe_float(ins.get("frequency",0)), "clicks":int(safe_float(ins.get("clicks",0)))})
    return items

def safe_float(value):
    try: return float(value) if value is not None else 0.0
    except (ValueError, TypeError): return 0.0

def resolve_avatar_url(account_id: str, account_name: Optional[str]) -> str:
    act_key = f"act_{account_id}" if account_id else None
    if account_id and client_avatars.get(account_id): return client_avatars[account_id]
    if act_key and client_avatars.get(act_key): return client_avatars[act_key]
    if account_name and client_avatars.get(account_name): return client_avatars[account_name]
    return ""

# ──────────────────────────────────────────────────────────────────────────────
# AI Analysis Logic
# ──────────────────────────────────────────────────────────────────────────────
async def get_ai_analysis(adsets: List[dict]) -> Dict:
    # ...
    simplified_adsets = [{"name":f"{d.get('account_name','')} / {d.get('adset_name','N/A')}", "spend":round(safe_float(d.get("spend")),2), "leads":int(safe_float(d.get("leads"))), "cpl":round(safe_float(d.get("cpl")),2), "ctr_link":round((safe_float(d.get("link_clicks"))/safe_float(d.get("impressions"))*100.0) if safe_float(d.get("impressions"))>0 else 0.0, 2)} for d in final_adsets]
    
    # --- ИЗМЕНЕНИЕ №2: Обновленный промпт для общего анализа ---
    system_prompt = """
You are a senior Meta Ads analyst. Your task is to analyze a summary of ad sets from multiple accounts.
Your response MUST be a valid JSON object in Russian with keys "summary", "insights", and "recommendations".
**IMPORTANT RULE:** All recommendations must be given **within the scope of a single ad account**. Never suggest moving budget between different accounts.
- `summary`: 2-3 sentence executive summary (Markdown). Mention total spend, leads, CPL.
- `insights`: Markdown list of 3-4 key insights. For each major account, identify its best-performing ad set.
- `recommendations`: A list of 2-3 actionable recommendation objects. Each object MUST have `priority` ("high", "medium", "low") and `text` (recommendation in Markdown).
Your final output must be a single, valid JSON object.
"""
    # ... (rest of the function is the same)
    pass

async def get_ai_detailed_analysis(adset_info: dict) -> Dict:
    # ...
    data_for_ai = {
        "adset_name": adset_info.get("adset_name"), "campaign_name": adset_info.get("campaign_name"),
        "objective": adset_info.get("objective"),
        "performance_summary": {"today": summarize_ads(ads_today), "yesterday": summarize_ads(ads_yesterday), "lifetime": summarize_ads(ads_maximum)},
        "top_ads_by_lifetime_cpa": sorted([{"name": ad.get("ad_name"), "leads": ad.get("leads"), "cpa": ad.get("cpa")} for ad in ads_maximum if ad.get("leads", 0) > 0], key=lambda x: x["cpa"])[:5]
    }

    # --- ИЗМЕНЕНИЕ №2: Обновленный промпт для детального анализа ---
    system_prompt = """
You are a meticulous performance marketing specialist analyzing trend data for a single ad set. 
Your response MUST be a valid JSON object in Russian with "summary", "insights", and "recommendations". Use Markdown.
- `summary`: Summarize the ad set's current performance (Today vs Yesterday) and its overall historical performance (Lifetime).
- `insights`: Provide detailed bullet points. Compare Today's CPL vs. Yesterday's CPL to identify trends. Identify the best and worst performing *ads* based on their Lifetime CPA.
- `recommendations`: A list of concrete, numbered recommendation objects. Each MUST have `priority` ("high", "medium", "low") and `text` (string).
Ensure your entire response is a single, valid JSON.
"""
    # ... (rest of the function is the same)
    pass
# ... (All endpoints remain the same)
# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/api/adsets")
async def get_all_adsets_data(
    date_preset: str = Query("last_7d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")
    try:
        async with aiohttp.ClientSession() as session:
            accounts = await get_ad_accounts(session)
            if not accounts: return []
            all_data: List[dict] = []
            for acc in accounts:
                acc_name, acc_id = acc.get("name"), acc.get("account_id")
                if not acc_id: continue
                adsets = await get_all_adsets_from_account(session, acc_id)
                if not adsets: continue
                
                insights = await get_insights_for_adsets(session, acc_id, [a["id"] for a in adsets], date_preset, start_date, end_date)
                insights_map = {row["adset_id"]: row for row in insights}

                for adset in adsets:
                    ins = insights_map.get(adset["id"])
                    if not ins: continue
                    
                    spend = safe_float(ins.get("spend", 0))
                    leads = sum(int(safe_float(a.get("value", 0))) for a in ins.get("actions", []) or [] if LEAD_ACTION_TYPE in a.get("action_type", ""))
                    
                    all_data.append({
                        "account_id": acc_id, "account_name": acc_name, "avatarUrl": resolve_avatar_url(acc_id, acc_name),
                        "adset_id": adset["id"], "adset_name": adset.get("name"),
                        "campaign_name": (adset.get("campaign") or {}).get("name"),
                        "status": adset.get("effective_status"),
                        "objective": (adset.get("campaign") or {}).get("objective", "N/A"),
                        "spend": spend, "leads": leads, "cpl": (spend / leads) if leads > 0 else 0.0,
                        "cpm": safe_float(ins.get("cpm", 0)), "ctr_all": safe_float(ins.get("ctr", 0)),
                        "link_clicks": int(safe_float(ins.get("inline_link_clicks", 0))),
                        "impressions": int(safe_float(ins.get("impressions", 0))),
                        "frequency": safe_float(ins.get("frequency", 0))
                    })
            return all_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/adsets/{adset_id}/ads")
async def get_ads_for_adset(
    adset_id: str, 
    date_preset: str = Query("last_7d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")
    try:
        async with aiohttp.ClientSession() as session: 
            return await build_ads_payload(session, adset_id, date_preset, start_date, end_date)
    except Exception as e:
        logging.error(f"!!! ADS API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
