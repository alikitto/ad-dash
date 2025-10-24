# backend/api/endpoints.py

import logging
from typing import List, Optional

from fastapi import APIRouter, Query, HTTPException, Body
# Важно: импорты теперь должны работать, так как мы запускаем uvicorn из папки backend
from services import facebook_service, ai_service
from models.payloads import AdSetPayload, StatusUpdatePayload
from core.config import META_TOKEN, API_VERSION

router = APIRouter()

@router.get("/adsets")
async def get_all_adsets_data(
    date_preset: str = Query("last_7d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")
    try:
        return await facebook_service.fetch_and_process_all_adsets(date_preset, start_date, end_date)
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        # Return empty list instead of raising error to prevent frontend crashes
        if "expired" in str(e).lower() or "invalid" in str(e).lower():
            return []
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/token-status")
async def check_token_status():
    """Check if Meta API token is valid"""
    if not META_TOKEN:
        return {"status": "error", "message": "Token not configured"}
    
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            url = f"https://graph.facebook.com/{API_VERSION}/me"
            params = {"access_token": META_TOKEN}
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"status": "valid", "user_id": data.get("id"), "name": data.get("name")}
                else:
                    error_data = await response.json()
                    return {"status": "invalid", "error": error_data.get("error", {}).get("message", "Unknown error")}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/adsets-list")
async def get_adsets_list():
    """Get list of all adsets for debugging"""
    if not META_TOKEN:
        return {"error": "Token not configured"}
    
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            # Get ad accounts first
            accounts_url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
            accounts_params = {
                "access_token": META_TOKEN,
                "fields": "name,account_id",
                "limit": 5
            }
            
            async with session.get(accounts_url, params=accounts_params) as accounts_response:
                if accounts_response.status != 200:
                    return {"error": "Failed to get ad accounts"}
                
                accounts_data = await accounts_response.json()
                accounts = accounts_data.get("data", [])
                
                if not accounts:
                    return {"error": "No ad accounts found"}
                
                # Get adsets from first account
                account_id = accounts[0]["account_id"]
                adsets_url = f"https://graph.facebook.com/{API_VERSION}/act_{account_id}/adsets"
                adsets_params = {
                    "access_token": META_TOKEN,
                    "fields": "id,name,status",
                    "limit": 10
                }
                
                async with session.get(adsets_url, params=adsets_params) as adsets_response:
                    if adsets_response.status != 200:
                        return {"error": "Failed to get adsets"}
                    
                    adsets_data = await adsets_response.json()
                    return {
                        "account": accounts[0],
                        "adsets": adsets_data.get("data", [])
                    }
                    
    except Exception as e:
        return {"error": str(e)}

@router.get("/test-facebook-api")
async def test_facebook_api():
    """Test Facebook API connection"""
    if not META_TOKEN:
        return {"error": "Token not configured"}
    
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            # Test basic API call
            url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
            params = {
                "access_token": META_TOKEN,
                "fields": "name,account_id",
                "limit": 1
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {"status": "success", "data": data}
                else:
                    error_data = await response.json()
                    return {"status": "error", "error": error_data}
                    
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/adsets/{adset_id}/stats")
async def get_adset_stats(adset_id: str, date_preset: str = Query("last_7d")):
    """Get detailed statistics for a specific adset across different time periods"""
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    
    logging.info(f"Getting stats for adset_id: {adset_id}")
    
    try:
        import aiohttp
        
        # Define time periods to fetch
        periods = [
            {"value": "today", "label": "Сегодня"},
            {"value": "yesterday", "label": "Вчера"}, 
            {"value": "last_3d", "label": "Позавчера"},
            {"value": "last_7d", "label": "Неделя"},
            {"value": "last_30d", "label": "Все время"}
        ]
        
        stats_data = []
        
        async with aiohttp.ClientSession() as session:
            # First, check if adset exists
            try:
                check_url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}"
                check_params = {"access_token": META_TOKEN, "fields": "id,name,status"}
                async with session.get(check_url, params=check_params) as check_response:
                    if check_response.status != 200:
                        logging.error(f"Adset {adset_id} not found or inaccessible: {check_response.status}")
                        return []
                    adset_info = await check_response.json()
                    logging.info(f"Adset info: {adset_info}")
            except Exception as e:
                logging.error(f"Error checking adset {adset_id}: {e}")
                return []
            
            for period in periods:
                try:
                    # Get insights for the adset
                    url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
                    params = {
                        "access_token": META_TOKEN,
                        "date_preset": period["value"],
                        "fields": "spend,impressions,clicks,link_clicks,actions,cost_per_action_type,cpm,ctr"
                    }
                    
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            insights = data.get("data", [])
                            
                            logging.info(f"Facebook API response for {period['value']}: {data}")
                            
                            if insights:
                                insight = insights[0]
                                
                                # Extract leads from actions
                                leads = 0
                                cpl = 0
                                actions = insight.get("actions", [])
                                
                                # Try different action types for leads
                                for action in actions:
                                    action_type = action.get("action_type", "")
                                    # Look for various lead-related actions
                                    if action_type in [
                                        "lead", 
                                        "onsite_conversion.lead_grouped", 
                                        "offsite_conversion.lead",
                                        "onsite_conversion.messaging_user_depth_3_message_send",  # This might be a lead
                                        "onsite_conversion.messaging_conversation_started_7d",
                                        "onsite_conversion.messaging_conversation_started_7d_click"
                                    ]:
                                        leads = int(action.get("value", 0))
                                        break
                                
                                # If no leads found, try to get from cost_per_action_type
                                if leads == 0:
                                    cost_per_action = insight.get("cost_per_action_type", [])
                                    for cost_action in cost_per_action:
                                        action_type = cost_action.get("action_type", "")
                                        if action_type in ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.lead"]:
                                            # Calculate leads from cost and spend
                                            cost = float(cost_action.get("value", 0))
                                            spend = float(insight.get("spend", 0))
                                            if cost > 0:
                                                leads = int(spend / cost)
                                            break
                                
                                # Calculate CPL
                                spend = float(insight.get("spend", 0))
                                if leads > 0:
                                    cpl = spend / leads
                                
                                # Calculate CTR manually if not provided
                                impressions = float(insight.get("impressions", 0))
                                clicks = float(insight.get("clicks", 0))
                                ctr = 0
                                if impressions > 0:
                                    ctr = (clicks / impressions) * 100
                                
                                # Calculate CPM manually if not provided
                                cpm = 0
                                if impressions > 0:
                                    cpm = (spend / impressions) * 1000
                                
                                stats_data.append({
                                    "period": period["value"],
                                    "leads": leads,
                                    "cpl": cpl,
                                    "cpm": cpm,
                                    "ctr": ctr,
                                    "spent": spend
                                })
                            else:
                                # No data for this period
                                stats_data.append({
                                    "period": period["value"],
                                    "leads": 0,
                                    "cpl": 0,
                                    "cpm": 0,
                                    "ctr": 0,
                                    "spent": 0
                                })
                        else:
                            # Error for this period, add empty data
                            stats_data.append({
                                "period": period["value"],
                                "leads": 0,
                                "cpl": 0,
                                "cpm": 0,
                                "ctr": 0,
                                "spent": 0
                            })
                            
                except Exception as e:
                    logging.error(f"Error fetching stats for period {period['value']}: {e}")
                    # Add empty data for failed period
                    stats_data.append({
                        "period": period["value"],
                        "leads": 0,
                        "cpl": 0,
                        "cpm": 0,
                        "ctr": 0,
                        "spent": 0
                    })
        
        return stats_data
        
    except Exception as e:
        logging.error(f"Error fetching adset stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch adset stats: {str(e)}")

@router.post("/analyze-adsets")
async def analyze_adsets_endpoint(adsets: List[dict] = Body(...)):
    if not adsets: raise HTTPException(status_code=400, detail="Adset data is required.")
    return await ai_service.get_ai_analysis(adsets)

@router.post("/analyze-adset-details")
async def analyze_adset_details_endpoint(payload: AdSetPayload):
    if not payload.adset: raise HTTPException(status_code=400, detail="Adset data is required.")
    return await ai_service.get_ai_detailed_analysis(payload.adset)

@router.get("/adsets/{adset_id}/ads")
async def get_ads_for_adset(
    adset_id: str,
    date_preset: str = Query("last_7d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    if not META_TOKEN: raise HTTPException(status_code=500, detail="Token not configured")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            return await facebook_service.build_ads_payload(session, adset_id, date_preset, start_date, end_date)
    except Exception as e:
        logging.error(f"!!! ADS API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/adsets/{adset_id}/update-status")
async def update_adset_status(adset_id: str, payload: StatusUpdatePayload):
    if payload.status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'ACTIVE' or 'PAUSED'.")
    try:
        return await facebook_service.update_entity_status(adset_id, payload.status)
    except Exception as e:
        logging.error(f"update_adset_status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ads/{ad_id}/update-status")
async def update_ad_status(ad_id: str, payload: StatusUpdatePayload):
    if payload.status not in ["ACTIVE", "PAUSED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'ACTIVE' or 'PAUSED'.")
    try:
        return await facebook_service.update_entity_status(ad_id, payload.status)
    except Exception as e:
        logging.error(f"update_ad_status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
