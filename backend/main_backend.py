# --- main_backend.py (Test Version with Fake Data) ---

import os
import logging
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- 1. Configuration ---
load_dotenv()
# META_TOKEN is not used in this test version

# --- 2. Initialize FastAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 3. TEST API ENDPOINT (returns fake data) ---
@app.get("/api/active-campaigns")
async def get_all_active_campaigns():
    logging.info("--- Request received on the TEST endpoint ---")
    
    # We don't go to the Meta API; we immediately return this fake data:
    fake_data = [
        {
            "account_name": "Test Account",
            "campaign_name": "Test Campaign #1",
            "objective": "Leads",
            "status": "ACTIVE",
            "spend": 123.45,
            "leads": 10,
            "cpl": 12.34
        },
        {
            "account_name": "Another Test Account",
            "campaign_name": "Display Check #2",
            "objective": "Traffic",
            "status": "ACTIVE",
            "spend": 50.00,
            "leads": 5,
            "cpl": 10.00
        }
    ]
    
    logging.info(f"--- Sending {len(fake_data)} fake campaigns ---")
    return fake_data
