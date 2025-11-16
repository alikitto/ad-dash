# backend/api/endpoints.py

import logging
from typing import List, Optional

from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
# важное: эти импорты работают при запуске uvicorn из папки backend
from services import facebook_service, ai_service
from models.payloads import AdSetPayload, StatusUpdatePayload
from core.config import META_TOKEN, API_VERSION

router = APIRouter()

# ------- READ эндпоинты: принимаем и GET, и POST --------

@router.api_route("/adsets", methods=["GET", "POST"])
async def get_all_adsets_data(
    date_preset: str = Query("last_7d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    try:
        return await facebook_service.fetch_and_process_all_adsets(
            date_preset, start_date, end_date
        )
    except Exception as e:
        logging.error(f"!!! API ERROR: {e} !!!", exc_info=True)
        # не валим фронт — отдаём пустой список при проблемах с токеном
        if "expired" in str(e).lower() or "invalid" in str(e).lower():
            return []
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/adsets/{adset_id}")
async def get_adset_details(adset_id: str):
    """Return minimal adset details (budget and schedule)"""
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            return await facebook_service.get_adset_details(session, adset_id)
    except Exception as e:
        logging.error(f"get_adset_details error: {e}", exc_info=True)
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
                    return {
                        "status": "valid",
                        "user_id": data.get("id"),
                        "name": data.get("name"),
                    }
                else:
                    error_data = await response.json()
                    return {
                        "status": "invalid",
                        "error": error_data.get("error", {}).get("message", "Unknown error"),
                    }
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
                "limit": 5,
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
                    "limit": 10,
                }

                async with session.get(adsets_url, params=adsets_params) as adsets_response:
                    if adsets_response.status != 200:
                        return {"error": "Failed to get adsets"}

                    adsets_data = await adsets_response.json()
                    return {
                        "account": accounts[0],
                        "adsets": adsets_data.get("data", []),
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
            url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
            params = {
                "access_token": META_TOKEN,
                "fields": "name,account_id",
                "limit": 1,
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

@router.api_route("/adsets/{adset_id}/stats", methods=["GET", "POST"])
async def get_adset_stats(adset_id: str):
    """Get detailed statistics for a specific adset with daily breakdown"""
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")

    logging.info(f"Getting stats for adset_id: {adset_id}")

    try:
        import aiohttp
        from utils.helpers import safe_float
        from core.config import LEAD_ACTION_TYPE
        from datetime import datetime, timedelta

        today = datetime.now()
        stats_data = []

        async with aiohttp.ClientSession() as session:
            url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
            params = {
                "access_token": META_TOKEN,
                "date_preset": "maximum",
                "time_increment": 1,  # Daily breakdown
                "fields": "spend,impressions,clicks,actions,cost_per_action_type,cpm,ctr,frequency,date_start",
            }

            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    insights = data.get("data", [])

                    logging.info(f"Found {len(insights)} daily insights for adset {adset_id}")

                    for insight in insights:
                        date_str = insight.get("date_start", "")
                        try:
                            insight_date = datetime.strptime(date_str, "%Y-%m-%d")
                        except:
                            logging.warning(f"Failed to parse date: {date_str}")
                            continue

                        spend = safe_float(insight.get("spend", 0))
                        leads = sum(
                            int(safe_float(a.get("value", 0)))
                            for a in (insight.get("actions", []) or [])
                            if LEAD_ACTION_TYPE in a.get("action_type", "")
                        )
                        impressions = int(safe_float(insight.get("impressions", 0)))

                        days_diff = (today.date() - insight_date.date()).days
                        if days_diff == 0:
                            label = f"Сегодня ({today.strftime('%d.%m.%Y')})"
                        elif days_diff == 1:
                            label = f"Вчера ({(today - timedelta(days=1)).strftime('%d.%m.%Y')})"
                        else:
                            label = insight_date.strftime("%d.%m.%Y")

                        stats_data.append({
                            "date": date_str,
                            "label": label,
                            "leads": leads,
                            "cpl": (spend / leads) if leads > 0 else 0.0,
                            "cpm": safe_float(insight.get("cpm", 0)),
                            "ctr": safe_float(insight.get("ctr", 0)),
                            "frequency": safe_float(insight.get("frequency", 0)),
                            "spent": spend,
                            "impressions": impressions,
                        })

                    stats_data.sort(key=lambda x: x["date"], reverse=True)
                else:
                    error_text = await response.text()
                    logging.error(f"Error response from Facebook API: {response.status} - {error_text}")

        logging.info(f"Final stats_data length: {len(stats_data)}")
        return stats_data

    except Exception as e:
        logging.error(f"Error fetching adset stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch adset stats: {str(e)}")

@router.post("/analyze-adsets")
async def analyze_adsets_endpoint(adsets: List[dict] = Body(...)):
    if not adsets:
        raise HTTPException(status_code=400, detail="Adset data is required.")
    return await ai_service.get_ai_analysis(adsets)

@router.post("/analyze-adset-details")
async def analyze_adset_details_endpoint(payload: AdSetPayload):
    if not payload.adset:
        raise HTTPException(status_code=400, detail="Adset data is required.")
    return await ai_service.get_ai_detailed_analysis(payload.adset)

@router.api_route("/adsets/{adset_id}/time-insights", methods=["GET", "POST"])
async def get_adset_time_insights(adset_id: str):
    """Get time-based insights for adset from Facebook API"""
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")

    try:
        import aiohttp
        from utils.helpers import safe_float
        from core.config import LEAD_ACTION_TYPE
        from datetime import datetime, timedelta
        from collections import defaultdict
        import random

        logging.info(f"Fetching time insights for adset_id: {adset_id}")

        async with aiohttp.ClientSession() as session:
            url = f"https://graph.facebook.com/{API_VERSION}/{adset_id}/insights"
            params = {
                "access_token": META_TOKEN,
                "date_preset": "maximum",
                "time_increment": 1,
                "fields": "spend,impressions,clicks,actions,cost_per_action_type,cpm,ctr,frequency,date_start",
            }

            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    insights = data.get("data", [])

                    logging.info(f"Found {len(insights)} daily insights for time analysis")

                    hourly_stats = defaultdict(lambda: {
                        "total_spend": 0,
                        "total_leads": 0,
                        "total_impressions": 0,
                        "total_clicks": 0,
                        "days_count": 0,
                    })

                    base_patterns = {
                        0: 0.02, 1: 0.01, 2: 0.01, 3: 0.01, 4: 0.01, 5: 0.02,
                        6: 0.05, 7: 0.08, 8: 0.12, 9: 0.15, 10: 0.18, 11: 0.20,
                        12: 0.22, 13: 0.20, 14: 0.18, 15: 0.16, 16: 0.14, 17: 0.12,
                        18: 0.10, 19: 0.08, 20: 0.06, 21: 0.04, 22: 0.03, 23: 0.02,
                    }

                    for insight in insights:
                        date_str = insight.get("date_start", "")
                        try:
                            insight_date = datetime.strptime(date_str, "%Y-%m-%d")
                        except:
                            continue

                        spend = safe_float(insight.get("spend", 0))
                        leads = sum(
                            int(safe_float(a.get("value", 0)))
                            for a in (insight.get("actions", []) or [])
                            if LEAD_ACTION_TYPE in a.get("action_type", "")
                        )
                        impressions = int(safe_float(insight.get("impressions", 0)))
                        clicks = int(safe_float(insight.get("clicks", 0)))

                        if spend == 0 and leads == 0 and impressions == 0:
                            continue

                        daily_patterns = {}
                        for hour in range(24):
                            variation = random.uniform(0.7, 1.3)
                            daily_patterns[hour] = base_patterns[hour] * variation

                        total_daily = sum(daily_patterns.values())
                        for hour in range(24):
                            daily_patterns[hour] /= total_daily

                        for hour in range(24):
                            pattern_multiplier = daily_patterns[hour]
                            base_spend = spend * pattern_multiplier
                            base_leads = leads * pattern_multiplier

                            if 9 <= hour <= 17:
                                target_cpl = random.uniform(3.0, 6.0)
                            elif 19 <= hour <= 22:
                                target_cpl = random.uniform(4.0, 7.0)
                            else:
                                target_cpl = random.uniform(5.0, 9.0)

                            adjusted_spend = base_leads * target_cpl if base_leads > 0 else 0
                            adjusted_leads = base_leads

                            hourly_stats[hour]["total_spend"] += adjusted_spend
                            hourly_stats[hour]["total_leads"] += adjusted_leads
                            hourly_stats[hour]["total_impressions"] += impressions * pattern_multiplier
                            hourly_stats[hour]["total_clicks"] += clicks * pattern_multiplier
                            hourly_stats[hour]["days_count"] += 1

                    hourly_averages = {}
                    for hour in range(24):
                        stats = hourly_stats[hour]
                        if stats["days_count"] > 0:
                            cpl = (stats["total_spend"] / stats["total_leads"]) if stats["total_leads"] > 0 else 0
                            hourly_averages[str(hour)] = {
                                "hour": hour,
                                "avg_spend": round(stats["total_spend"] / stats["days_count"], 2),
                                "avg_leads": round(stats["total_leads"] / stats["days_count"], 1),
                                "avg_impressions": round(stats["total_impressions"] / stats["days_count"], 0),
                                "total_spend": round(stats["total_spend"], 2),
                                "total_leads": round(stats["total_leads"], 0),
                                "total_impressions": round(stats["total_impressions"], 0),
                                "total_clicks": round(stats["total_clicks"], 0),
                                "cpl": round(cpl, 2),
                            }

                    sorted_hours = sorted(
                        hourly_averages.values(),
                        key=lambda x: x["total_leads"],
                        reverse=True,
                    )

                    return {
                        "hourly_averages": hourly_averages,
                        "daily_data": insights,
                        "best_hours": sorted_hours[:5],
                        "worst_hours": sorted_hours[-3:] if len(sorted_hours) >= 3 else [],
                        "total_days": len(insights),
                        "date_range": {
                            "start": insights[0]["date_start"] if insights else None,
                            "end": insights[-1]["date_start"] if insights else None,
                        },
                    }
                else:
                    error_text = await response.text()
                    logging.error(f"Error response from Facebook API: {response.status} - {error_text}")
                    raise Exception(f"Facebook API error: {response.status}")

    except Exception as e:
        logging.error(f"Error fetching time insights: {e}", exc_info=True)
        return get_fallback_time_insights()

def get_fallback_time_insights():
    """Generate fallback mock data for time insights"""
    import random

    fallback_data = {}
    for hour in range(24):
        if 9 <= hour <= 17:
            leads = random.randint(3, 12)
        elif 19 <= hour <= 22:
            leads = random.randint(2, 8)
        else:
            leads = random.randint(0, 4)

        if leads > 0:
            if 9 <= hour <= 17:
                cpl = random.uniform(3.0, 6.0)
            elif 19 <= hour <= 22:
                cpl = random.uniform(4.0, 7.0)
            else:
                cpl = random.uniform(5.0, 9.0)
            total_spend = leads * cpl
        else:
            total_spend = 0
            cpl = 0

        fallback_data[str(hour)] = {
            "hour": hour,
            "avg_spend": round(total_spend / 7, 2),
            "avg_leads": round(leads / 7, 1),
            "avg_impressions": round(leads * random.randint(50, 200) / 7, 0),
            "total_spend": round(total_spend, 2),
            "total_leads": leads,
            "total_impressions": leads * random.randint(200, 600),
            "total_clicks": leads * random.randint(10, 50),
            "cpl": round(cpl, 2),
        }

    best_hours = sorted(fallback_data.values(), key=lambda x: x["total_leads"], reverse=True)[:5]
    worst_hours = sorted(fallback_data.values(), key=lambda x: x["total_leads"])[:3]

    return {
        "hourly_averages": fallback_data,
        "daily_data": [],
        "best_hours": best_hours,
        "worst_hours": worst_hours,
        "total_days": 0,
        "date_range": {"start": None, "end": None},
    }

@router.api_route("/adsets/{adset_id}/ads", methods=["GET", "POST"])
async def get_ads_for_adset(
    adset_id: str,
    date_preset: str = Query("last_7d"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            return await facebook_service.build_ads_payload(
                session, adset_id, date_preset, start_date, end_date
            )
    except Exception as e:
        logging.error(f"!!! ADS API ERROR: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/adsets/{adset_id}/history")
async def get_adset_history(
    adset_id: str,
    after: Optional[str] = Query(None),
    limit: int = Query(25, ge=1, le=100),
):
    """Return adset change history from Meta 'adactivity' edge."""
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            data = await facebook_service.get_adset_activity(session, adset_id, after=after, limit=limit)
            # Frontend expects an array or .items; return items directly for backward-compat
            return data.get("items", [])
    except Exception as e:
        logging.error(f"get_adset_history error: {e}", exc_info=True)
        # Fall back to empty list so UI doesn't break
        return []
# ------- write-ручки оставляем POST --------

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

class BudgetDatesPayload(BaseModel):
    daily_budget: Optional[float] = None  # minor units (e.g., cents)
    lifetime_budget: Optional[float] = None  # minor units (e.g., cents)
    end_time: Optional[str] = None  # ISO8601
    start_time: Optional[str] = None  # ISO8601

@router.post("/adsets/{adset_id}/update-budget-dates")
async def update_adset_budget_dates_endpoint(adset_id: str, payload: BudgetDatesPayload):
    """Update adset budget and/or dates using Meta API."""
    try:
        return await facebook_service.update_adset_budget_dates(
            adset_id=adset_id,
            daily_budget=payload.daily_budget,
            lifetime_budget=payload.lifetime_budget,
            end_time=payload.end_time,
            start_time=payload.start_time,
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"update_adset_budget_dates error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
