# backend/api/auth_endpoints.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from services.auth_service import get_password_hash, verify_password, create_access_token
from core.config import DATABASE_URL

router = APIRouter()

# --- Pydantic Models ---
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Database Connection ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Endpoints ---
@router.post("/signup", status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db = Depends(get_db)):
    # Проверяем, не занят ли email
    query = text("SELECT email FROM users WHERE email = :email")
    existing_user = db.execute(query, {"email": user.email}).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    insert_query = text("INSERT INTO users (email, hashed_password) VALUES (:email, :hashed_password)")
    db.execute(insert_query, {"email": user.email, "hashed_password": hashed_password})
    db.commit()
    return {"message": "User created successfully"}


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: UserLogin, db = Depends(get_db)):
    query = text("SELECT email, hashed_password FROM users WHERE email = :email")
    user = db.execute(query, {"email": form_data.email}).mappings().first()

    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user['email'])
    return {"access_token": access_token, "token_type": "bearer"}
