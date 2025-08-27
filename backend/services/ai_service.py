# backend/services/ai_service.py

import openai
import json
import logging
import asyncio
import aiohttp
from typing import List, Dict

from fastapi import HTTPException
from core.config import OPENAI_API_KEY
from services.facebook_service import build_ads_payload
from utils.helpers import safe_float

async def get_ai_analysis(adsets: List[dict]) -> Dict:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key is not configured.")

    MAX_ADSETS_FOR_AI = 35
    final_adsets = adsets

    if len(adsets) > MAX_ADSETS_FOR_AI:
        top_by_spend = sorted(adsets, key=lambda x: safe_float(x.get("spend")), reverse=True)[:15]
        top_by_leads = sorted(adsets, key=lambda x: safe_float(x.get("leads")), reverse=True)[:10]
        worst_performers = sorted(
            [a for a in adsets if safe_float(a.get("leads")) == 0 and safe_float(a.get("spend")) > 0],
            key=lambda x: safe_float(x.get("spend")),
            reverse=True
        )[:5]
        combined = {d["adset_id"]: d for d in top_by_spend + top_by_leads + worst_performers}
        final_adsets = list(combined.values())

    simplified_adsets = []
    for d in final_adsets:
        impressions = safe_float(d.get("impressions"))
        link_clicks = safe_float(d.get("link_clicks"))
        ctr_link = (link_clicks / impressions * 100.0) if impressions > 0 else 0.0
        simplified_adsets.append({
            "name": f"{d.get('account_name', '')[:15]} / {d.get('adset_name', 'N/A')[:25]}",
            "status": d.get("status"), "spend": round(safe_float(d.get("spend")), 2),
            "leads": int(safe_float(d.get("leads"))), "cpl": round(safe_float(d.get("cpl")), 2),
            "ctr_link": round(ctr_link, 2),
        })

    system_prompt = """
You are a senior Meta Ads analyst. Analyze a summary of ad sets from multiple accounts. Your response MUST be a valid JSON object in Russian with "summary", "insights", "recommendations".
**IMPORTANT RULE:** All recommendations must be given **within the scope of a single ad account**. Never suggest moving budget between different accounts.
- `summary`: 2-3 sentence executive summary (Markdown). Mention total spend, leads, CPL.
- `insights`: Markdown list of 3-4 key insights. For each major account, identify its best-performing ad set.
- `recommendations`: A list of 2-3 actionable recommendation objects. Each object MUST have `priority` ("high", "medium", "low") and `text` (recommendation in Markdown).
Ensure your entire response is a single, valid JSON.
"""
    total_spend = round(sum(safe_float(a.get("spend")) for a in adsets), 2)
    total_leads = int(sum(safe_float(a.get("leads")) for a in adsets))
    user_data = {"total_spend": total_spend, "total_leads": total_leads, "adsets_sample": simplified_adsets}

    try:
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o", response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_data, indent=2, ensure_ascii=False)},
            ],
            temperature=0.5, max_tokens=2000,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logging.error(f"OpenAI API error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get AI analysis: {e}")

async def get_ai_detailed_analysis(adset_info: dict) -> Dict:
    if not OPENAI_API_KEY: raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    adset_id = adset_info.get("adset_id")
    if not adset_id: raise HTTPException(status_code=400, detail="Adset ID is missing in the payload.")
    
    ads_today, ads_yesterday, ads_maximum = [], [], []
    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(
            build_ads_payload(session, adset_id, "today"),
            build_ads_payload(session, adset_id, "yesterday"),
            build_ads_payload(session, adset_id, "maximum"),
            return_exceptions=True
        )
    
    if isinstance(results[0], list): ads_today = results[0]
    else: logging.warning(f"Could not fetch 'today' data for {adset_id}: {results[0]}")
    if isinstance(results[1], list): ads_yesterday = results[1]
    else: logging.warning(f"Could not fetch 'yesterday' data for {adset_id}: {results[1]}")
    if isinstance(results[2], list): ads_maximum = results[2]
    else: logging.warning(f"Could not fetch 'maximum' data for {adset_id}: {results[2]}")

    def summarize_ads(ads_list):
        if not ads_list: return {"total_spend": 0, "total_leads": 0, "cpl": 0, "ads_count": 0}
        total_spend = sum(safe_float(ad.get("spend")) for ad in ads_list)
        total_leads = sum(safe_float(ad.get("leads")) for ad in ads_list)
        return {"total_spend": round(total_spend, 2), "total_leads": int(total_leads), "cpl": round(total_spend / total_leads, 2) if total_leads > 0 else 0, "ads_count": len(ads_list)}

    data_for_ai = {
        "adset_name": adset_info.get("adset_name"), "campaign_name": adset_info.get("campaign_name"),
        "objective": adset_info.get("objective"),
        "performance_summary": {"today": summarize_ads(ads_today), "yesterday": summarize_ads(ads_yesterday), "lifetime": summarize_ads(ads_maximum)},
        "top_ads_by_lifetime_cpa": sorted([{"name": ad.get("ad_name"), "leads": ad.get("leads"), "cpa": ad.get("cpa")} for ad in ads_maximum if ad.get("leads", 0) > 0], key=lambda x: x["cpa"])[:5]
    }

    system_prompt = """
You are a meticulous performance marketing specialist analyzing trend data for a single ad set. Your response MUST be a valid JSON object in Russian with "summary", "insights", "recommendations". Use Markdown.
- `summary`: Summarize the ad set's current performance (Today vs Yesterday) and its overall historical performance (Lifetime).
- `insights`: Provide detailed bullet points. Compare Today's CPL vs. Yesterday's CPL to identify trends. Identify the best and worst performing *ads* based on their Lifetime CPA.
- `recommendations`: A list of concrete, numbered recommendation objects. Each MUST have `priority` ("high", "medium", "low") and `text` (string).
Ensure your entire response is a single, valid JSON.
"""
    try:
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(model="gpt-4o", response_format={"type":"json_object"}, messages=[{"role":"system","content":system_prompt}, {"role":"user","content":json.dumps(data_for_ai,ensure_ascii=False)}], temperature=0.5, max_tokens=2000)
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logging.error(f"OpenAI detailed analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Detailed AI analysis failed: {e}")
