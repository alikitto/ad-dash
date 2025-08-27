# backend/services/facebook_service.py

import aiohttp
import json
import asyncio
from datetime import datetime
from typing import List, Optional, Dict

from core.config import META_TOKEN, API_VERSION, LEAD_ACTION_TYPE
from utils.helpers import safe_float, resolve_avatar_url

async def fb_request(session: aiohttp.ClientSession, method: str, url: str, params: dict = None, data: dict = None):
    """A generic helper for making requests to the Facebook Graph API."""
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
        "level": "adset",
        "fields": "adset_id,spend,actions,cpm,ctr,clicks,impressions,frequency,inline_link_clicks",
        "filtering": json.dumps(filtering_object, separators=(',', ':')),
        "limit": 5000
    }
    if start_date and end_date:
        params["time_range"] = f'{{"since":"{start_date}","until":"{end_date}"}}'
    else:
        params["date_preset"] = date_preset if date_preset != "maximum" else 'last_7d'
        if date_preset == "maximum":
             params["time_range"] = f'{{"since":"2025-06-01","until":"{datetime.now().strftime("%Y-%m-%d")}"}}'
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_ads_metadata(session: aiohttp.ClientSession, adset_id: str) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/ads"
    params = {"fields": "id,name,status,effective_status,creative{thumbnail_url,image_url}", "limit": 200}
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def get_ads_insights(session: aiohttp.ClientSession, adset_id: str, date_preset: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
    params = {"level": "ad", "fields": "ad_id,spend,impressions,clicks,inline_link_clicks,ctr,cpm,frequency,actions", "limit": 5000}
    if start_date and end_date:
        params["time_range"] = f'{{"since":"{start_date}","until":"{end_date}"}}'
    else:
        params["date_preset"] = date_preset if date_preset != "maximum" else 'last_7d'
        if date_preset == "maximum":
             params["time_range"] = f'{{"since":"2025-06-01","until":"{datetime.now().strftime("%Y-%m-%d")}"}}'
    return (await fb_request(session, "get", url, params=params)).get("data", []) or []

async def build_ads_payload(session: aiohttp.ClientSession, adset_id: str, date_preset: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
    ads_meta, ads_insights = await asyncio.gather(
        get_ads_metadata(session, adset_id),
        get_ads_insights(session, adset_id, date_preset, start_date, end_date)
    )
    ins_map = {row.get("ad_id"): row for row in ads_insights if row.get("ad_id")}
    items = []
    for ad in ads_meta:
        ins = ins_map.get(ad.get("id"), {})
        spend = safe_float(ins.get("spend", 0))
        impressions = int(safe_float(ins.get("impressions", 0)))
        link_clicks = int(safe_float(ins.get("inline_link_clicks", 0)))
        leads = sum(int(safe_float(a.get("value", 0))) for a in ins.get("actions", []) or [] if LEAD_ACTION_TYPE in a.get("action_type", ""))
        items.append({
            "ad_id": ad.get("id"), "ad_name": ad.get("name"), "status": ad.get("status") or ad.get("effective_status"),
            "thumbnail_url": (ad.get("creative") or {}).get("thumbnail_url") or (ad.get("creative") or {}).get("image_url"),
            "spend": spend, "impressions": impressions, "link_clicks": link_clicks, "leads": leads,
            "cpa": (spend / leads) if leads else 0.0,
            "ctr_link": (link_clicks / impressions * 100.0) if impressions else 0.0,
            "ctr": safe_float(ins.get("ctr", 0)), "cpm": safe_float(ins.get("cpm", 0)),
            "frequency": safe_float(ins.get("frequency", 0)), "clicks": int(safe_float(ins.get("clicks", 0)))
        })
    return items

async def fetch_and_process_all_adsets(date_preset: str, start_date: Optional[str], end_date: Optional[str]) -> List[dict]:
    """Orchestrator function to get all adset data from all accounts."""
    async with aiohttp.ClientSession() as session:
        accounts = await get_ad_accounts(session)
        if not accounts: return []
        
        all_data = []
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

async def update_entity_status(entity_id: str, new_status: str) -> dict:
    """Updates the status of an ad or adset."""
    url = f"https://graph.facebook.com/{API_VERSION}/{entity_id}"
    data = {"status": new_status}
    async with aiohttp.ClientSession() as session:
        return await fb_request(session, "post", url, data=data)
