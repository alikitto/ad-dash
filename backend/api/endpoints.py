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
async def get_adset_stats(adset_id: str):
    """Get detailed statistics for a specific adset across different time periods"""
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    
    logging.info(f"Getting stats for adset_id: {adset_id}")
    
    try:
        import aiohttp
        from services.facebook_service import get_ad_accounts, get_insights_for_adsets
        from utils.helpers import safe_float
        from core.config import LEAD_ACTION_TYPE
        
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
            # Get all accounts to find which one contains this adset
            accounts = await get_ad_accounts(session)
            if not accounts:
                return []
            
            # Find the account that contains this adset
            target_account_id = None
            for acc in accounts:
                acc_id = acc.get("account_id")
                if not acc_id:
                    continue
                
                # Check if this adset belongs to this account
                try:
                    insights = await get_insights_for_adsets(session, acc_id, [adset_id], "today")
                    if insights and any(ins.get("adset_id") == adset_id for ins in insights):
                        target_account_id = acc_id
                        break
                except:
                    continue
            
            if not target_account_id:
                logging.error(f"Could not find account for adset {adset_id}")
                return []
            
            logging.info(f"Found account {target_account_id} for adset {adset_id}")
            
            # Get insights for each period using the same logic as main dashboard
            for period in periods:
                try:
                    insights = await get_insights_for_adsets(session, target_account_id, [adset_id], period["value"])
                    
                    if insights:
                        insight = insights[0]  # Should be only one for this adset
                        logging.info(f"Found insights for {period['value']}: {insight}")
                        
                        # Use the same logic as main dashboard
                        spend = safe_float(insight.get("spend", 0))
                        leads = sum(int(safe_float(a.get("value", 0))) for a in insight.get("actions", []) or [] if LEAD_ACTION_TYPE in a.get("action_type", ""))
                        
                        stats_data.append({
                            "period": period["value"],
                            "leads": leads,
                            "cpl": (spend / leads) if leads > 0 else 0.0,
                            "cpm": safe_float(insight.get("cpm", 0)),
                            "ctr": safe_float(insight.get("ctr", 0)),
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
