#!/usr/bin/env python3
"""
Railway Database Initialization Script
This script should be run on Railway to initialize the database
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def init_railway_db():
    """Initialize PostgreSQL database on Railway"""
    
    # Get database URL from Railway environment
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
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
        
        # Create index on email
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        """)
        
        print("✅ Railway database initialized successfully!")
        print("✅ Users table created!")
        
        # Test the table
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        print(f"📊 Current users count: {count}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing Railway database: {e}")
        return False

if __name__ == "__main__":
    init_railway_db()
