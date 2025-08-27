# backend/api/user_endpoints.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy import text
from api.auth_endpoints import get_db
from services.auth_service import get_email_from_token

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

class User(BaseModel):
    name: str
    email: str
    role: str

@router.get("/me", response_model=User)
def read_users_me(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    email = get_email_from_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    query = text("SELECT name, email, role FROM users WHERE email = :email AND is_active = TRUE")
    user = db.execute(query, {"email": email}).mappings().first()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found or not active")
        
    return user
