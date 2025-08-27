# backend/utils/helpers.py

from typing import Optional
from core.config import CLIENT_AVATARS

def safe_float(value):
    try:
        return float(value) if value is not None else 0.0
    except (ValueError, TypeError):
        return 0.0

def resolve_avatar_url(account_id: str, account_name: Optional[str]) -> str:
    act_key = f"act_{account_id}" if account_id else None
    if account_id and CLIENT_AVATARS.get(account_id):
        return CLIENT_AVATARS[account_id]
    if act_key and CLIENT_AVATARS.get(act_key):
        return CLIENT_AVATARS[act_key]
    if account_name and CLIENT_AVATARS.get(account_name):
        return CLIENT_AVATARS[account_name]
    return ""
