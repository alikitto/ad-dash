# --- main_backend.py (Final Corrected Version) ---

import os
import asyncio
import aiohttp
import json
import logging
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

class AdSetDetailPayload(BaseModel):
    adset: dict
    ads: List[dict]

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

async def get_insights_for_adsets(session: aiohttp.ClientSession, account_id: str, adset_ids: list, date_preset: str) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {"level":"adset", "fields":"adset_id,spend,actions,cpm,ctr,clicks,impressions,frequency,inline_link_clicks", "filtering":f'[{{"field":"adset.id","operator":"IN","value":{json.dumps(adset_ids)}}}]', "limit":5000}
    if date_preset != "maximum": params["date_preset"] = date_preset
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_ads_metadata(session: aiohttp.ClientSession, adset_id: str) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/ads"
    params = {"fields": "id,name,status,effective_status,creative{thumbnail_url,image_url}", "limit": 200}
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_ads_insights(session: aiohttp.ClientSession, adset_id: str, date_preset: str) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
    params = {"level":"ad", "fields":"ad_id,spend,impressions,clicks,inline_link_clicks,ctr,cpm,frequency,actions", "limit":5000}
    if date_preset != "maximum": params["date_preset"] = date_preset
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def build_ads_payload(session: aiohttp.ClientSession, adset_id: str, date_preset: str) -> List[dict]:
    ads_meta, ads_insights = await asyncio.gather(get_ads_metadata(session, adset_id), get_ads_insights(session, adset_id, date_preset))
    ins_map, items = {row.get("ad_id"): row for row in ads_insights if row.get("ad_id")}, []
    for ad in ads_meta:
        ins = ins_map.get(ad.get("id"), {}) or {}
        spend, impressions, link_clicks = float(ins.get("spend",0)or 0), int(ins.get("impressions",0)or 0), int(ins.get("inline_link_clicks",0)or 0)
        leads = sum(int(a.get("value",0)) for a in ins.get("actions",[])or[] if LEAD_ACTION_TYPE in a.get("action_type",""))
        items.append({"ad_id":ad.get("id"), "ad_name":ad.get("name"), "status":ad.get("status")or ad.get("effective_status"), "thumbnail_url":(ad.get("creative")or{}).get("thumbnail_url")or(ad.get("creative")or{}).get("image_url"), "spend":spend, "impressions":impressions, "link_clicks":link_clicks, "leads":leads, "cpa":(spend/leads) if leads else 0.0, "ctr_link":(link_clicks/impressions*100.0) if impressions else 0.0, "ctr":float(ins.get("ctr",0)or 0), "cpm":float(ins.get("cpm",0)or 0), "frequency":float(ins.get("frequency",0)or 0), "clicks":int(ins.get("clicks",0)or 0)})
    return items

def resolve_avatar_url(account_id: str, account_name: Optional[str]) -> str:
    act_key = f"act_{account_id}" if account_id else None
    if account_id and client_avatars.get(account_id): return client_avatars[account_id]
    if act_key and client_avatars.get(act_key): return client_avatars[act_key]
    if account_name and client_avatars.get(account_name): return client_avatars[account_name]
    return ""

def safe_float(value):
    try: return float(value) if value is not None else 0.0
    except (ValueError, TypeError): return 0.0

# ──────────────────────────────────────────────────────────────────────────────
# AI Analysis Logic
# ──────────────────────────────────────────────────────────────────────────────
async def get_ai_analysis(adsets: List[dict]) -> Dict:
    if not OPENAI_API_KEY: raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    MAX_ADSETS_FOR_AI, final_adsets = 35, adsets
    if len(adsets) > MAX_ADSETS_FOR_AI:
        top_by_spend = sorted(adsets, key=lambda x: safe_float(x.get("spend")), reverse=True)[:15]
        top_by_leads = sorted(adsets, key=lambda x: safe_float(x.get("leads")), reverse=True)[:10]
        worst = sorted([a for a in adsets if safe_float(a.get("leads"))==0 and safe_float(a.get("spend"))>0], key=lambda x: safe_float(x.get("spend")), reverse=True)[:5]
        final_adsets = list({d["adset_id"]: d for d in top_by_spend + top_by_leads + worst}.values())
    simplified_adsets = []
    for d in final_adsets:
        impressions, link_clicks = safe_float(d.get("impressions")), safe_float(d.get("link_clicks"))
        simplified_adsets.append({"name":f"{d.get('account_name','')} / {d.get('adset_name','N/A')}", "status":d.get("status"), "spend":round(safe_float(d.get("spend")),2), "leads":int(safe_float(d.get("leads"))), "cpl":round(safe_float(d.get("cpl")),2), "ctr_link":round((link_clicks/impressions*100.0) if impressions>0 else 0.0, 2)})
    system_prompt = f"You are a Meta Ads analyst. Analyze this list of ad sets. Provide a concise analysis in Russian as a JSON object with 'summary', 'insights', 'recommendations'. You are analyzing a sample of {len(final_adsets)} from {len(adsets)} total ad sets."
    total_spend, total_leads = round(sum(safe_float(a.get("spend")) for a in adsets), 2), int(sum(safe_float(a.get("leads")) for a in adsets))
    user_data = {"total_spend": total_spend, "total_leads": total_leads, "adsets_sample": simplified_adsets}
    try:
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(model="gpt-4o", response_format={"type":"json_object"}, messages=[{"role":"system","content":system_prompt}, {"role":"user","content":json.dumps(user_data,ensure_ascii=False)}], temperature=0.5, max_tokens=2000)
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logging.error(f"OpenAI API error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get AI analysis: {e}")

async def get_ai_detailed_analysis(payload: AdSetDetailPayload) -> Dict:
    adset, ads = payload.adset, payload.ads
    if not OPENAI_API_KEY: raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    simplified_adset = {"name":adset.get("adset_name"), "status":adset.get("status"), "spend":adset.get("spend"), "leads":adset.get("leads"), "cpl":adset.get("cpl"), "objective":adset.get("objective")}
    simplified_ads = [{"name":ad.get("ad_name"), "spend":ad.get("spend"), "leads":ad.get("leads"), "cpa":ad.get("cpa"), "ctr_link":ad.get("ctr_link")} for ad in ads]
    system_prompt = "You are a world-class Meta Ads expert. Given a parent 'adset' and its child 'ads', provide a detailed, actionable analysis in Russian as a JSON object with 'summary', 'insights', and 'recommendations'. Compare ads, identify winners/losers, and give advice like pausing ads or reallocating budget."
    user_data = {"adset": simplified_adset, "ads": simplified_ads}
    try:
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(model="gpt-4o", response_format={"type":"json_object"}, messages=[{"role":"system","content":system_prompt}, {"role":"user","content":json.dumps(user_data,ensure_ascii=False)}], temperature=0.5, max_tokens=2000)
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logging.error(f"OpenAI detailed analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detailed AI analysis failed: {e}")

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/api/adsets")
async def get_all_adsets_data(date_preset: str = Query("last_7d")):
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
                insights = await get_insights_for_adsets(session, acc_id, [a["id"] for a in adsets], date_preset)
                insights_map = {row["adset_id"]: row for row in insights}
                for adset in adsets:
                    ins = insights_map.get(adset["id"])
                    if not ins: continue
                    spend = float(ins.get("spend", 0) or 0)
                    leads = sum(int(a.get("value", 0)) for a in ins.get("actions", []) or [] if LEAD_ACTION_TYPE in a.get("action_type", ""))
                    all_data.append({"account_name":acc_name, "avatarUrl":resolve_avatar_url(acc_id,acc_name), "adset_id":adset["id"], "adset_name":adset.get("name"), "campaign_name":(adset.get("campaign")or{}).get("name"), "status":adset.get("effective_status"), "objective":(adset.get("campaign")or{}).get("objective","N/A"), "spend":spend, "leads":leads, "cpl":(spend/leads) if leads>0 else 0.0, "cpm":float(ins.get("cpm",0)or 0), "ctr_all":float(ins.get("ctr",0)or 0), "link_clicks":int(ins.get("inline_link_clicks",0)or 0), "impressions":int(ins.get("impressions",0)or 0), "frequency":float(ins.get("frequency",0)or 0)})
            return all_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-adsets")
async def analyze_adsets_endpoint(adsets: List[dict] = Body(...)):
    if not adsets: raise HTTPException(status_code=400, detail="Adset data is required.")
    return await get_ai_analysis(adsets)

@app.post("/api/analyze-adset-details")
async def analyze_adset_details_endpoint(payload: AdSetDetailPayload):
    if not payload.adset or not payload.ads: raise HTTPException(status_code=400, detail="Adset and ads data are required.")
    return await get_ai_detailed_analysis(payload)

@app.post("/api/adsets/{adset_id}/update-status")
async def update_adset_status(adset_id: str, payload: Dict = Body(...)):
    new_status = (payload or {}).get("status")
    if new_status not in ["ACTIVE", "PAUSED"]: raise HTTPException(status_code=400, detail="Invalid status")
    url, data = f"https://graph.facebook.com/{API_VERSION}/{adset_id}", {"status": new_status}
    try:
        async with aiohttp.ClientSession() as session: return await fb_request(session, "post", url, data=data)
    except Exception as e:
        logging.error(f"update_adset_status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/adsets/{adset_id}/ads")
async def get_ads_for_adset(adset_id: str, date_preset: str = Query("last_7d")):
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")
    try:
        async with aiohttp.ClientSession() as session: return await build_ads_payload(session, adset_id, date_preset)
    except Exception as e:
        logging.error(f"!!! ADS API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ads/{ad_id}/update-status")
async def update_ad_status(ad_id: str, payload: Dict = Body(...)):
    new_status = (payload or {}).get("status")
    if new_status not in ["ACTIVE", "PAUSED"]: raise HTTPException(status_code=400, detail="Invalid status")
    url, data = f"https://graph.facebook.com/{API_VERSION}/{ad_id}", {"status": new_status}
    try:
        async with aiohttp.ClientSession() as session: return await fb_request(session, "post", url, data=data)
    except Exception as e:
        logging.error(f"update_ad_status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
