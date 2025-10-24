#!/usr/bin/env python3
"""
Simple test server for authentication testing
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
import jwt

app = FastAPI(title="Ad-Dash Test Server")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT settings
JWT_SECRET = "test-secret-key"
JWT_ALGORITHM = "HS256"

# Pydantic models
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def init_test_db():
    """Initialize test database"""
    conn = sqlite3.connect("test_auth.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password"""
    return hash_password(password) == hashed

def create_token(email: str) -> str:
    """Create JWT token"""
    payload = {
        "sub": email,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Ad-Dash Test Server is running!"}

@app.post("/auth/signup", status_code=201)
def signup(user: UserCreate):
    """User registration"""
    conn = sqlite3.connect("test_auth.db")
    cursor = conn.cursor()
    
    try:
        # Check if user exists
        cursor.execute("SELECT email FROM users WHERE email = ?", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        hashed_password = hash_password(user.password)
        cursor.execute(
            "INSERT INTO users (name, email, hashed_password) VALUES (?, ?, ?)",
            (user.name, user.email, hashed_password)
        )
        conn.commit()
        
        return {"message": "User created successfully"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/auth/token", response_model=Token)
def login(user: UserLogin):
    """User login"""
    conn = sqlite3.connect("test_auth.db")
    cursor = conn.cursor()
    
    try:
        # Get user
        cursor.execute(
            "SELECT email, hashed_password, is_active FROM users WHERE email = ?",
            (user.email,)
        )
        user_data = cursor.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        email, hashed_password, is_active = user_data
        
        if not verify_password(user.password, hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not is_active:
            raise HTTPException(status_code=403, detail="Account is not active")
        
        # Create token
        token = create_token(email)
        return {"access_token": token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    
    # Initialize database
    init_test_db()
    print("✅ Test database initialized")
    
    # Run server
    print("🚀 Starting test server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
