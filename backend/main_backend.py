# --- main_backend.py (Final Version) ---

import os
import asyncio
import aiohttp
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
load_dotenv()
META_TOKEN = os.getenv("META_ACCESS_TOKEN")
API_VERSION = "v19.0"
LEAD_ACTION_TYPE = "onsite_conversion.messaging_conversation_started_7d"

app = FastAPI()

# --- CORS Configuration ---
origins = [
    "https://ad-dash-frontend-production.up.railway.app", # REPLACE WITH YOUR FRONTEND URL
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Meta API Functions ---
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

async def get_insights_for_account(session: aiohttp.ClientSession, account_id: str):
    url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/insights"
    params = {
        "fields": "campaign_id,campaign_name,spend,actions,objective,cpm,ctr,inline_link_ctr,clicks,cpc,effective_status",
        "level": "campaign",
        "date_preset": "last_7d",
        "limit": 500
    }
    response = await fb_request(session, "get", url, params=params)
    return response.get("data", [])

# --- API Endpoints ---
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
                    purchases = sum(int(a["value"]) for a in campaign.get("actions", []) if "purchase" in a.get("action_type", ""))
                    
                    cpl = (spend / leads) if leads > 0 else 0
                    cpa = (spend / purchases) if purchases > 0 else 0

                    all_campaigns_data.append({
                        "account_name": acc['name'],
                        "campaign_id": campaign.get('campaign_id'),
                        "campaign_name": campaign.get('campaign_name'),
                        "status": campaign.get('effective_status'),
                        "objective": campaign.get('objective'),
                        "spend": spend,
                        "leads": leads,
                        "cpl": cpl,
                        "cpa": cpa,
                        "cpm": float(campaign.get("cpm", 0)),
                        "ctr_all": float(campaign.get("ctr", 0)),
                        "ctr_link_click": float(campaign.get("inline_link_ctr", 0)),
                        "clicks": int(campaign.get("clicks", 0)),
                    })
        
        return all_campaigns_data
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/{campaign_id}/update-status")
async def update_campaign_status(campaign_id: str, payload: Dict = Body(...)):
    new_status = payload.get("status")
    if new_status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status provided.")

    url = f"https://graph.facebook.com/{API_VERSION}/{campaign_id}"
    data = {"status": new_status}
    
    try:
        async with aiohttp.ClientSession() as session:
            response = await fb_request(session, "post", url, data=data)
            return response
    except Exception as e:
        logging.error(f"!!! Status Update Error: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
