import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import timedelta

from services.auth_service import get_password_hash, verify_password, create_access_token
from core.config import DATABASE_URL, JWT_EXPIRE_MINUTES

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Pydantic Models ---
class UserCreate(BaseModel):
    name: str # Добавлено поле для имени
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Database Connection ---
# Use PostgreSQL for Railway, SQLite for local development
database_url = DATABASE_URL or "sqlite:///./ad_dash.db"

if database_url.startswith("postgres"):
    # PostgreSQL for Railway
    engine = create_engine(database_url)
else:
    # SQLite for local development
    engine = create_engine(database_url)

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
    try:
        # Проверяем, не занят ли email
        query = text("SELECT email FROM users WHERE email = :email")
        existing_user = db.execute(query, {"email": user.email}).scalar_one_or_none()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Хешируем пароль
        hashed_password = get_password_hash(user.password)
        
        # Insert user with proper SQL syntax for PostgreSQL
        insert_query = text(
            "INSERT INTO users (name, email, hashed_password, is_active) VALUES (:name, :email, :hashed_password, :is_active)"
        )
        
        db.execute(insert_query, {
            "name": user.name, 
            "email": user.email, 
            "hashed_password": hashed_password,
            "is_active": True
        })
        db.commit()
        
        return {"message": "User created successfully. Awaiting admin approval."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Registration failed for %s", user.email)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: UserLogin, db = Depends(get_db)):
    try:
        # Запрашиваем из базы данных поле 'is_active'
        query = text("SELECT email, hashed_password, is_active FROM users WHERE email = :email")
        user = db.execute(query, {"email": form_data.email}).mappings().first()

        if not user or not verify_password(form_data.password, user['hashed_password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Проверка, активен ли аккаунт пользователя (с безопасной проверкой)
        if user.get('is_active') is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active. Please contact administrator.",
            )
            
        # Extend token lifetime if remember_me requested (30 days), otherwise use default config
        expiry_minutes = JWT_EXPIRE_MINUTES
        if form_data.remember_me:
            expiry_minutes = 60 * 24 * 30  # 30 days

        access_token = create_access_token(
            subject=user['email'],
            expires_delta=timedelta(minutes=expiry_minutes)
        )
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login failed for %s", form_data.email)
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.post("/init-db")
def init_database_endpoint(db = Depends(get_db)):
    """Initialize database tables - for Railway deployment"""
    try:
        if database_url.startswith("postgres"):
            # PostgreSQL syntax
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            create_index_query = text("""
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
            """)
        else:
            # SQLite syntax
            create_table_query = text("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            create_index_query = text("""
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
            """)
        
        db.execute(create_table_query)
        db.execute(create_index_query)
        db.commit()
        
        return {"message": "Database initialized successfully!"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database initialization failed: {str(e)}")

@router.get("/debug-env")
def debug_environment():
    """Debug environment variables"""
    import os
    return {
        "DATABASE_URL": os.getenv("DATABASE_URL"),
        "DATABASE_PUBLIC_URL": os.getenv("DATABASE_PUBLIC_URL"),
        "RAILWAY_DATABASE_URL": os.getenv("RAILWAY_DATABASE_URL"),
        "POSTGRES_URL": os.getenv("POSTGRES_URL"),
        "all_env_keys": [key for key in os.environ.keys() if "DATABASE" in key or "POSTGRES" in key]
    }

@router.get("/test-db")
def test_database(db = Depends(get_db)):
    """Test database connection"""
    try:
        # Simple query to test connection
        result = db.execute(text("SELECT 1 as test"))
        test_value = result.scalar()
        return {"status": "success", "test_value": test_value, "database_url": database_url}
    except Exception as e:
        return {"status": "error", "error": str(e), "database_url": database_url}

@router.get("/test-signup")
def test_signup_simple():
    """Test signup without database"""
    return {"message": "Signup endpoint is working", "test": "ok"}

@router.post("/test-signup-post")
def test_signup_post(user: UserCreate):
    """Test signup POST without database"""
    return {"message": "Signup POST is working", "user": user.name, "email": user.email}

@router.get("/check-tables")
def check_tables(db = Depends(get_db)):
    """Check if tables exist"""
    try:
        # Check if users table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        """))
        users_table_exists = result.scalar()
        
        # If table exists, check its structure
        if users_table_exists:
            columns_result = db.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users'
                ORDER BY ordinal_position;
            """))
            columns = [{"name": row[0], "type": row[1]} for row in columns_result.fetchall()]
            
            # Try to count users
            count_result = db.execute(text("SELECT COUNT(*) FROM users"))
            user_count = count_result.scalar()
            
            return {
                "status": "success",
                "users_table_exists": users_table_exists,
                "columns": columns,
                "user_count": user_count
            }
        else:
            return {
                "status": "success",
                "users_table_exists": False,
                "message": "Users table does not exist"
            }
            
    except Exception as e:
        return {"status": "error", "error": str(e)}
