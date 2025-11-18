import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import make_url

from core.config import DATABASE_URL

router = APIRouter()

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured. Cannot initialize clients endpoints.")

connect_args = {}
try:
    url_obj = make_url(DATABASE_URL)
    if url_obj.drivername.startswith("postgres") and "sslmode" not in url_obj.query:
        connect_args["sslmode"] = "require"
except Exception:
    pass

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args or None,
)


class ClientCreate(BaseModel):
    account_id: str
    account_name: str
    avatar_url: Optional[str] = None
    monthly_budget: float
    start_date: str
    monthly_payment_azn: float


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


def init_clients_table():
    """Ensure clients table exists (PostgreSQL)."""
    create_table_sql = """
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            account_id TEXT UNIQUE NOT NULL,
            account_name TEXT NOT NULL,
            avatar_url TEXT,
            monthly_budget NUMERIC(18,2) NOT NULL DEFAULT 0,
            start_date DATE NOT NULL,
            monthly_payment_azn NUMERIC(18,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    """
    create_index_sql = "CREATE INDEX IF NOT EXISTS idx_clients_account_id ON clients(account_id);"
    trigger_fn_sql = """
        CREATE OR REPLACE FUNCTION set_clients_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """
    trigger_sql = """
        DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
        CREATE TRIGGER trg_clients_updated_at
        BEFORE UPDATE ON clients
        FOR EACH ROW
        EXECUTE FUNCTION set_clients_updated_at();
    """
    with engine.begin() as conn:
        conn.execute(text(create_table_sql))
        conn.execute(text(create_index_sql))
        conn.execute(text(trigger_fn_sql))
        conn.execute(text(trigger_sql))


init_clients_table()

@router.get("/clients", response_model=List[ClientResponse])
async def get_all_clients():
    """Get all clients"""
    query = text("""
        SELECT id, account_id, account_name, avatar_url, monthly_budget,
               start_date, monthly_payment_azn, created_at, updated_at
        FROM clients
        ORDER BY account_name
    """)
    try:
        with engine.connect() as conn:
            rows = conn.execute(query).mappings().all()
            return [dict(row) for row in rows]
    except SQLAlchemyError as e:
        logging.error(f"Error fetching clients: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch clients")

@router.get("/clients/{account_id}", response_model=ClientResponse)
async def get_client(account_id: str):
    """Get client by account_id"""
    query = text("""
        SELECT id, account_id, account_name, avatar_url, monthly_budget,
               start_date, monthly_payment_azn, created_at, updated_at
        FROM clients
        WHERE account_id = :account_id
    """)
    try:
        with engine.connect() as conn:
            row = conn.execute(query, {"account_id": account_id}).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Client not found")
            return dict(row)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logging.error(f"Error fetching client: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch client")

@router.post("/clients", response_model=ClientResponse)
async def create_client(client: ClientCreate):
    """Create a new client"""
    insert_sql = text("""
        INSERT INTO clients (account_id, account_name, avatar_url, monthly_budget, start_date, monthly_payment_azn)
        VALUES (:account_id, :account_name, :avatar_url, :monthly_budget, :start_date, :monthly_payment_azn)
        RETURNING id, account_id, account_name, avatar_url, monthly_budget,
                  start_date, monthly_payment_azn, created_at, updated_at
    """)
    params = {
        "account_id": client.account_id,
        "account_name": client.account_name,
        "avatar_url": client.avatar_url,
        "monthly_budget": client.monthly_budget,
        "start_date": client.start_date,
        "monthly_payment_azn": client.monthly_payment_azn,
    }
    try:
        with engine.begin() as conn:
            row = conn.execute(insert_sql, params).mappings().first()
            return dict(row)
    except SQLAlchemyError as e:
        msg = str(e.__cause__ or e)
        if "unique" in msg.lower():
            raise HTTPException(status_code=400, detail="Client with this account_id already exists")
        logging.error(f"Error creating client: {e}")
        raise HTTPException(status_code=500, detail="Failed to create client")

@router.put("/clients/{account_id}", response_model=ClientResponse)
async def update_client(account_id: str, client_update: ClientUpdate):
    """Update a client"""
    updates = []
    params = {"account_id": account_id}
    if client_update.account_name is not None:
        updates.append("account_name = :account_name")
        params["account_name"] = client_update.account_name
    if client_update.avatar_url is not None:
        updates.append("avatar_url = :avatar_url")
        params["avatar_url"] = client_update.avatar_url
    if client_update.monthly_budget is not None:
        updates.append("monthly_budget = :monthly_budget")
        params["monthly_budget"] = client_update.monthly_budget
    if client_update.start_date is not None:
        updates.append("start_date = :start_date")
        params["start_date"] = client_update.start_date
    if client_update.monthly_payment_azn is not None:
        updates.append("monthly_payment_azn = :monthly_payment_azn")
        params["monthly_payment_azn"] = client_update.monthly_payment_azn

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_sql = text(f"""
        UPDATE clients
        SET {', '.join(updates)}
        WHERE account_id = :account_id
        RETURNING id, account_id, account_name, avatar_url, monthly_budget,
                  start_date, monthly_payment_azn, created_at, updated_at
    """)
    try:
        with engine.begin() as conn:
            row = conn.execute(update_sql, params).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Client not found")
            return dict(row)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logging.error(f"Error updating client: {e}")
        raise HTTPException(status_code=500, detail="Failed to update client")

@router.delete("/clients/{account_id}")
async def delete_client(account_id: str):
    """Delete a client"""
    delete_sql = text("DELETE FROM clients WHERE account_id = :account_id")
    try:
        with engine.begin() as conn:
            result = conn.execute(delete_sql, {"account_id": account_id})
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Client not found")
            return {"message": "Client deleted successfully"}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logging.error(f"Error deleting client: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete client")

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

