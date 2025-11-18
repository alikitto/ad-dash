import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import make_url

from core.config import DATABASE_URL

router = APIRouter()

if not DATABASE_URL:
    logging.error("DATABASE_URL is not configured!")
    raise RuntimeError("DATABASE_URL is not configured. Cannot initialize clients endpoints.")

logging.info(f"Initializing clients engine with DATABASE_URL: {DATABASE_URL}")

connect_args = {}
try:
    url_obj = make_url(DATABASE_URL)
    if url_obj.drivername.startswith("postgres") and "sslmode" not in url_obj.query:
        connect_args["sslmode"] = "require"
        logging.info("Added sslmode=require to connect_args")
except Exception as e:
    logging.warning(f"Could not parse DATABASE_URL: {e}")
    pass

try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args if connect_args else {},
    )
    logging.info("SQLAlchemy engine created successfully")
except Exception as e:
    logging.error(f"Failed to create engine: {e}")
    raise


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
    total_paid: float = 0.0
    last_payment_at: Optional[str] = None
    created_at: str
    updated_at: str

class PaymentCreate(BaseModel):
    paid_at: str = Field(..., description="ISO date string")
    amount: float
    note: Optional[str] = None

class PaymentUpdate(BaseModel):
    paid_at: Optional[str] = None
    amount: Optional[float] = None
    note: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    client_id: int
    paid_at: str
    amount: float
    note: Optional[str]
    created_at: str

def serialize_client_row(row):
    if not row:
        return None
    mapping = row
    if hasattr(row, "_mapping"):
        mapping = row._mapping

    return {
        "id": int(mapping["id"]),
        "account_id": str(mapping["account_id"]),
        "account_name": str(mapping["account_name"]),
        "avatar_url": str(mapping["avatar_url"] or ""),
        "monthly_budget": float(mapping["monthly_budget"] or 0.0),
        "start_date": str(mapping["start_date"]),
        "monthly_payment_azn": float(mapping["monthly_payment_azn"] or 0.0),
        "total_paid": float(mapping.get("total_paid") or 0.0),
        "last_payment_at": str(mapping["last_payment_at"]) if mapping.get("last_payment_at") else None,
        "created_at": str(mapping["created_at"]),
        "updated_at": str(mapping["updated_at"]),
    }

def serialize_payment_row(row):
    if not row:
        return None
    mapping = row
    if hasattr(row, "_mapping"):
        mapping = row._mapping
    return {
        "id": int(mapping["id"]),
        "client_id": int(mapping["client_id"]),
        "paid_at": str(mapping["paid_at"]),
        "amount": float(mapping["amount"]),
        "note": mapping.get("note"),
        "created_at": str(mapping["created_at"]),
    }

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


# Initialize table only if engine is ready
try:
    init_clients_table()
    logging.info("Clients table initialized successfully")
except Exception as e:
    logging.error(f"Failed to initialize clients table: {e}", exc_info=True)
    # Don't crash the whole app - table might already exist or DB not available

def init_client_payments_table():
    sql = """
        CREATE TABLE IF NOT EXISTS client_payments (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
            paid_at DATE NOT NULL,
            amount NUMERIC(18,2) NOT NULL,
            note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """
    index_sql = "CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);"
    with engine.begin() as conn:
        conn.execute(text(sql))
        conn.execute(text(index_sql))

try:
    init_client_payments_table()
    logging.info("client_payments table ready")
except Exception as e:
    logging.error(f"Failed to initialize client_payments table: {e}", exc_info=True)

def get_client_row_by_account(account_id: str):
    query = text("SELECT * FROM clients WHERE account_id = :account_id")
    with engine.connect() as conn:
        row = conn.execute(query, {"account_id": account_id}).mappings().first()
        return row

def get_payment_row(payment_id: int, client_id: Optional[int] = None):
    query = text("""
        SELECT * FROM client_payments
        WHERE id = :payment_id
        {client_filter}
    """.format(client_filter="AND client_id = :client_id" if client_id is not None else ""))
    params = {"payment_id": payment_id}
    if client_id is not None:
        params["client_id"] = client_id
    with engine.connect() as conn:
        row = conn.execute(query, params).mappings().first()
        return row

@router.get("/clients")
async def get_all_clients():
    """Get all clients"""
    try:
        logging.info("GET /api/clients called")
        query = text("""
            SELECT c.id,
                   c.account_id,
                   c.account_name,
                   COALESCE(c.avatar_url, '') as avatar_url,
                   COALESCE(c.monthly_budget, 0) as monthly_budget,
                   c.start_date,
                   COALESCE(c.monthly_payment_azn, 0) as monthly_payment_azn,
                   c.created_at,
                   c.updated_at,
                   COALESCE(pay.total_paid, 0) AS total_paid,
                   pay.last_payment_at
            FROM clients c
            LEFT JOIN (
                SELECT client_id,
                       SUM(amount) AS total_paid,
                       MAX(paid_at) AS last_payment_at
                FROM client_payments
                GROUP BY client_id
            ) pay ON pay.client_id = c.id
            ORDER BY c.account_name
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query)
            rows = result.fetchall()
            logging.info(f"Fetched {len(rows)} rows from database")
            clients = [serialize_client_row(row) for row in rows]
            logging.info(f"Successfully processed {len(clients)} clients")
            return clients
            
    except SQLAlchemyError as e:
        logging.error(f"Database error fetching clients: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logging.error(f"Unexpected error fetching clients: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.get("/clients/{account_id}", response_model=ClientResponse)
async def get_client(account_id: str):
    """Get client by account_id"""
    query = text("""
        SELECT c.*,
               COALESCE(pay.total_paid, 0) AS total_paid,
               pay.last_payment_at
        FROM clients c
        LEFT JOIN (
            SELECT client_id,
                   SUM(amount) AS total_paid,
                   MAX(paid_at) AS last_payment_at
            FROM client_payments
            GROUP BY client_id
        ) pay ON pay.client_id = c.id
        WHERE c.account_id = :account_id
    """)
    try:
        with engine.connect() as conn:
            row = conn.execute(query, {"account_id": account_id}).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Client not found")
            return serialize_client_row(row)
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
        RETURNING id,
                  account_id,
                  account_name,
                  COALESCE(avatar_url, '') AS avatar_url,
                  COALESCE(monthly_budget, 0) AS monthly_budget,
                  start_date,
                  COALESCE(monthly_payment_azn, 0) AS monthly_payment_azn,
                  created_at,
                  updated_at
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
            return serialize_client_row(row)
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
        RETURNING id,
                  account_id,
                  account_name,
                  COALESCE(avatar_url, '') AS avatar_url,
                  COALESCE(monthly_budget, 0) AS monthly_budget,
                  start_date,
                  COALESCE(monthly_payment_azn, 0) AS monthly_payment_azn,
                  created_at,
                  updated_at
    """)
    try:
        with engine.begin() as conn:
            row = conn.execute(update_sql, params).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Client not found")
            return serialize_client_row(row)
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

@router.get("/clients/{account_id}/payments", response_model=List[PaymentResponse])
async def get_client_payments(account_id: str):
    client = get_client_row_by_account(account_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    query = text("""
        SELECT id, client_id, paid_at, amount, note, created_at
        FROM client_payments
        WHERE client_id = :client_id
        ORDER BY paid_at DESC, created_at DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(query, {"client_id": client["id"]}).mappings().all()
        return [serialize_payment_row(row) for row in rows]

@router.post("/clients/{account_id}/payments", response_model=PaymentResponse)
async def add_client_payment(account_id: str, payload: PaymentCreate):
    client = get_client_row_by_account(account_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    try:
        paid_at = datetime.fromisoformat(payload.paid_at).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    insert_sql = text("""
        INSERT INTO client_payments (client_id, paid_at, amount, note)
        VALUES (:client_id, :paid_at, :amount, :note)
        RETURNING id, client_id, paid_at, amount, note, created_at
    """)
    params = {
        "client_id": client["id"],
        "paid_at": paid_at,
        "amount": payload.amount,
        "note": payload.note,
    }
    try:
        with engine.begin() as conn:
            row = conn.execute(insert_sql, params).mappings().first()
            return serialize_payment_row(row)
    except SQLAlchemyError as e:
        logging.error(f"Error adding payment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to add payment")

@router.put("/clients/{account_id}/payments/{payment_id}", response_model=PaymentResponse)
async def update_client_payment(account_id: str, payment_id: int, payload: PaymentUpdate):
    client = get_client_row_by_account(account_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    payment = get_payment_row(payment_id, client_id=client["id"])
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    updates = []
    params = {"payment_id": payment_id}
    if payload.paid_at is not None:
        try:
            paid_at = datetime.fromisoformat(payload.paid_at).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        updates.append("paid_at = :paid_at")
        params["paid_at"] = paid_at
    if payload.amount is not None:
        updates.append("amount = :amount")
        params["amount"] = payload.amount
    if payload.note is not None:
        updates.append("note = :note")
        params["note"] = payload.note
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_sql = text(f"""
        UPDATE client_payments
        SET {', '.join(updates)}
        WHERE id = :payment_id
        RETURNING id, client_id, paid_at, amount, note, created_at
    """)
    try:
        with engine.begin() as conn:
            row = conn.execute(update_sql, params).mappings().first()
            return serialize_payment_row(row)
    except SQLAlchemyError as e:
        logging.error(f"Error updating payment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update payment")

