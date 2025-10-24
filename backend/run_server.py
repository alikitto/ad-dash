#!/usr/bin/env python3
"""
Development server runner for Ad-Dash Backend
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def main():
    """Run the development server"""
    
    # Check if .env file exists
    env_file = backend_dir / ".env"
    if not env_file.exists():
        print("⚠️  Warning: .env file not found. Using default values.")
        print("   Create a .env file with your configuration.")
    
    # Initialize database
    print("🔧 Initializing database...")
    try:
        from init_db import init_database
        init_database()
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        return
    
    # Run the server
    print("🚀 Starting Ad-Dash Backend Server...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📚 API docs will be available at: http://localhost:8000/docs")
    print("🔄 Press Ctrl+C to stop the server")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(backend_dir)],
        log_level="info"
    )

if __name__ == "__main__":
    main()
