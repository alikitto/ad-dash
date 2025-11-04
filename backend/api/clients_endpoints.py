# backend/api/clients_endpoints.py

import sqlite3
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

router = APIRouter()

# Pydantic models
class ClientCreate(BaseModel):
    account_id: str
    account_name: str
    avatar_url: Optional[str] = None
    monthly_budget: float
    start_date: str  # Дата начала работы в формате YYYY-MM-DD
    monthly_payment_azn: float  # Оплата в месяц в AZN

class ClientUpdate(BaseModel):
    account_name: Optional[str] = None
    avatar_url: Optional[str] = None
    monthly_budget: Optional[float] = None
    start_date: Optional[str] = None
    monthly_payment_azn: Optional[float] = None

class ClientResponse(BaseModel):
    id: int
    account_id: str
    account_name: str
    avatar_url: Optional[str]
    monthly_budget: float
    start_date: str
    monthly_payment_azn: float
    created_at: str
    updated_at: str

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect("ad_dash.db")
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def init_clients_table():
    """Initialize clients table if it doesn't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id TEXT UNIQUE NOT NULL,
                account_name TEXT NOT NULL,
                avatar_url TEXT,
                monthly_budget REAL NOT NULL DEFAULT 0,
                start_date TEXT NOT NULL,
                monthly_payment_azn REAL NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_clients_account_id ON clients(account_id)
        """)
        conn.commit()
    except Exception as e:
        logging.error(f"Error initializing clients table: {e}")
        conn.rollback()
    finally:
        conn.close()

# Initialize table on module load
init_clients_table()

@router.get("/clients", response_model=List[ClientResponse])
async def get_all_clients():
    """Get all clients"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, account_id, account_name, avatar_url, monthly_budget, 
                   start_date, monthly_payment_azn, created_at, updated_at
            FROM clients
            ORDER BY account_name
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        logging.error(f"Error fetching clients: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/clients/{account_id}", response_model=ClientResponse)
async def get_client(account_id: str):
    """Get client by account_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, account_id, account_name, avatar_url, monthly_budget, 
                   start_date, monthly_payment_azn, created_at, updated_at
            FROM clients
            WHERE account_id = ?
        """, (account_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Client not found")
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching client: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/clients", response_model=ClientResponse)
async def create_client(client: ClientCreate):
    """Create a new client"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO clients (account_id, account_name, avatar_url, monthly_budget, start_date, monthly_payment_azn)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            client.account_id,
            client.account_name,
            client.avatar_url,
            client.monthly_budget,
            client.start_date,
            client.monthly_payment_azn
        ))
        conn.commit()
        
        # Fetch the created client
        cursor.execute("""
            SELECT id, account_id, account_name, avatar_url, monthly_budget, 
                   start_date, monthly_payment_azn, created_at, updated_at
            FROM clients
            WHERE id = ?
        """, (cursor.lastrowid,))
        row = cursor.fetchone()
        return dict(row)
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(status_code=400, detail="Client with this account_id already exists")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.error(f"Error creating client: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/clients/{account_id}", response_model=ClientResponse)
async def update_client(account_id: str, client_update: ClientUpdate):
    """Update a client"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Build update query dynamically based on provided fields
        updates = []
        values = []
        
        if client_update.account_name is not None:
            updates.append("account_name = ?")
            values.append(client_update.account_name)
        if client_update.avatar_url is not None:
            updates.append("avatar_url = ?")
            values.append(client_update.avatar_url)
        if client_update.monthly_budget is not None:
            updates.append("monthly_budget = ?")
            values.append(client_update.monthly_budget)
        if client_update.start_date is not None:
            updates.append("start_date = ?")
            values.append(client_update.start_date)
        if client_update.monthly_payment_azn is not None:
            updates.append("monthly_payment_azn = ?")
            values.append(client_update.monthly_payment_azn)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(account_id)
        
        query = f"""
            UPDATE clients
            SET {', '.join(updates)}
            WHERE account_id = ?
        """
        cursor.execute(query, values)
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Fetch the updated client
        cursor.execute("""
            SELECT id, account_id, account_name, avatar_url, monthly_budget, 
                   start_date, monthly_payment_azn, created_at, updated_at
            FROM clients
            WHERE account_id = ?
        """, (account_id,))
        row = cursor.fetchone()
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating client: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/clients/{account_id}")
async def delete_client(account_id: str):
    """Delete a client"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM clients WHERE account_id = ?", (account_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        return {"message": "Client deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting client: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/clients/from-accounts/list")
async def get_clients_from_accounts():
    """Get list of available ad accounts from Meta API"""
    import aiohttp
    from core.config import META_TOKEN, API_VERSION
    
    if not META_TOKEN:
        raise HTTPException(status_code=500, detail="Token not configured")
    
    try:
        async with aiohttp.ClientSession() as session:
            url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
            params = {
                "access_token": META_TOKEN,
                "fields": "name,account_id",
                "limit": 500
            }
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    error_data = await response.json()
                    raise Exception(f"Facebook API error: {error_data}")
                data = await response.json()
                accounts = data.get("data", [])
                return [
                    {
                        "account_id": acc.get("account_id", "").replace("act_", ""),
                        "account_name": acc.get("name", "Unknown")
                    }
                    for acc in accounts
                ]
    except Exception as e:
        logging.error(f"Error fetching accounts from Meta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

