#!/usr/bin/env python3
"""
Database initialization script for Ad-Dash
Creates the users table with proper schema
"""

import sqlite3
import os
from pathlib import Path

def init_database():
    """Initialize the SQLite database with users table"""
    
    # Get database path
    db_path = "ad_dash.db"
    
    # Create database connection
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create users table
        cursor.execute("""
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
        
        # Create index on email for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        """)
        
        # Commit changes
        conn.commit()
        print("✅ Database initialized successfully!")
        print(f"📁 Database file: {os.path.abspath(db_path)}")
        
        # Check if table was created
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if cursor.fetchone():
            print("✅ Users table created successfully!")
        else:
            print("❌ Failed to create users table")
            
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    init_database()
