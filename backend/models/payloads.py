# backend/models/payloads.py

from pydantic import BaseModel
from typing import Dict

class AdSetPayload(BaseModel):
    adset: dict

class StatusUpdatePayload(BaseModel):
    status: str
