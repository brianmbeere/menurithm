#!/usr/bin/env python3
"""
Convenience script to run database migrations from the backend root directory.
This script calls the actual migration script located in app/db/
"""

import os
import sys
import subprocess

def main():
    # Get the directory where this script is located (backend root)
    backend_root = os.path.dirname(os.path.abspath(__file__))
    
    # Path to the actual migration script
    migration_script = os.path.join(backend_root, "app", "db", "migrate_database.py")
    
    if not os.path.exists(migration_script):
        print(f"❌ Migration script not found at: {migration_script}")
        sys.exit(1)
    
    print(f"🔄 Running migration script from: {migration_script}")
    
    # Run the migration script
    try:
        subprocess.run([sys.executable, migration_script], check=True, cwd=backend_root)
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed with exit code: {e.returncode}")
        sys.exit(1)

if __name__ == "__main__":
    main()
