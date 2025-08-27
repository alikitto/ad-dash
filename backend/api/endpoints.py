# backend/api/endpoints.py

import logging
from typing import List, Optional

from fastapi import APIRouter, Query, HTTPException, Body
# Важно: импорты теперь должны работать, так как мы запускаем uvicorn из папки backend
from services import facebook_service, ai_service
from models.payloads import AdSetPayload, StatusUpdatePayload
from core.config import META_TOKEN

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
        raise HTTPException(status_code=500, detail=str(e))

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
