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
    
    if not META_TOKEN:
        raise Exception("Meta access token is not configured")
    
    async with session.request(method, url, params=params, json=data) as response:
        if response.status == 400:
            error_data = await response.json()
            if "error" in error_data:
                error_msg = error_data["error"].get("message", "Unknown Facebook API error")
                if "expired" in error_msg.lower() or "invalid" in error_msg.lower():
                    raise Exception(f"Facebook API token expired or invalid: {error_msg}")
                else:
                    raise Exception(f"Facebook API error: {error_msg}")
        
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

async def update_adset_budget_dates(adset_id: str, daily_budget: Optional[float] = None, lifetime_budget: Optional[float] = None, end_time: Optional[str] = None, start_time: Optional[str] = None) -> Dict:
    """
    Update adset budget (daily or lifetime) and optionally dates via Facebook Graph API.
    Budgets must be provided in the smallest currency unit (e.g., cents).
    Dates should be ISO8601 strings if provided.
    """
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    import aiohttp
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}"
    data: Dict[str, str] = {}
    # Meta expects integers in minor units
    if daily_budget is not None:
        data["daily_budget"] = str(int(round(daily_budget)))
    if lifetime_budget is not None:
        data["lifetime_budget"] = str(int(round(lifetime_budget)))
    if end_time is not None:
        data["end_time"] = end_time
    if start_time is not None:
        data["start_time"] = start_time
    if not data:
        return {"updated": False, "message": "No fields to update"}
    params = {"access_token": META_TOKEN}
    async with aiohttp.ClientSession() as session:
        async with session.post(url, params=params, data=data) as response:
            resp_json = await response.json()
            if response.status != 200:
                raise HTTPException(status_code=response.status, detail=resp_json)
            return {"updated": True, "response": resp_json}

async def _get_entity_activity(session: aiohttp.ClientSession, entity_id: str, after: Optional[str], limit: int) -> Dict:
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    url = f"https://graph.facebook.com/{API_VERSION}/{entity_id}/adactivity"
    params: Dict[str, str] = {
        "access_token": META_TOKEN,
        "limit": str(max(1, min(limit, 100))),
        # event_type could be filtered if needed; we keep all for now
        # "event_type": "adset_updated,adset_created",
    }
    if after:
        params["after"] = after
    data = await fb_request(session, "get", url, params=params)
    raw_items = data.get("data", []) or []
    items = []
    for it in raw_items:
        # it contains event_time, event_type, actor_id, actor_name, extra_data
        event_time = it.get("event_time")
        event_type = it.get("event_type")
        actor = it.get("actor_name") or it.get("actor_id") or "system"
        extra = it.get("extra_data") or {}
        # Try to build a concise details string
        try:
            if isinstance(extra, dict):
                # highlight common fields
                changed_fields: List[str] = []
                for key in ["budget", "daily_budget", "lifetime_budget", "start_time", "end_time", "status", "effective_status", "name"]:
                    if key in extra:
                        changed_fields.append(f"{key}: {extra.get(key)}")
                details = ", ".join(changed_fields) if changed_fields else str(extra)
            else:
                details = str(extra)
        except Exception:
            details = ""
        items.append({
            "timestamp": event_time,
            "user": actor,
            "action": event_type,
            "details": details,
        })
    paging = (data.get("paging") or {})
    cursors = (paging.get("cursors") or {})
    return {
        "items": items,
        "paging": {
            "after": cursors.get("after"),
            "before": cursors.get("before"),
            "next": paging.get("next"),
            "previous": paging.get("previous"),
        }
    }

async def get_adset_activity(session: aiohttp.ClientSession, adset_id: str, after: Optional[str] = None, limit: int = 25) -> Dict:
    """
    Fetch adset activity (change history) from Meta Graph API.
    """
    return await _get_entity_activity(session, adset_id, after, limit)

async def get_campaign_activity(session: aiohttp.ClientSession, campaign_id: str, after: Optional[str] = None, limit: int = 25) -> Dict:
    """
    Fetch campaign activity (change history) from Meta Graph API.
    """
    return await _get_entity_activity(session, campaign_id, after, limit)

async def get_adset_details(session: aiohttp.ClientSession, adset_id: str) -> Dict:
    """
    Fetch ad set details that include budgets and scheduling.
    Returns a minimal normalized dict with common keys used by the frontend.
    """
    # Request both daily and lifetime budgets and schedule-related fields
    fields = ",".join([
        "id",
        "name",
        "campaign{id,name}",
        "status",
        "effective_status",
        "daily_budget",
        "lifetime_budget",
        "start_time",
        "end_time",
        "updated_time"
    ])
    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}"
    params = {"fields": fields}
    data = await fb_request(session, "get", url, params=params)
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "campaign_id": ((data.get("campaign") or {}).get("id")),
        "campaign_name": ((data.get("campaign") or {}).get("name")),
        "status": data.get("status") or data.get("effective_status"),
        "daily_budget": data.get("daily_budget"),
        "lifetime_budget": data.get("lifetime_budget"),
        "start_time": data.get("start_time"),
        "end_time": data.get("end_time"),
        "updated_time": data.get("updated_time"),
    }
