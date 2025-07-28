#!/usr/bin/env python3
"""
Convenience script to run database migration tests from the backend root directory.
This script calls the actual test script located in app/db/
"""

import os
import sys
import subprocess

def main():
    # Get the directory where this script is located (backend root)
    backend_root = os.path.dirname(os.path.abspath(__file__))
    
    # Path to the actual test script
    test_script = os.path.join(backend_root, "app", "db", "test_uniqueness.py")
    
    if not os.path.exists(test_script):
        print(f"❌ Test script not found at: {test_script}")
        sys.exit(1)
    
    print(f"🧪 Running test script from: {test_script}")
    
    # Run the test script
    try:
        subprocess.run([sys.executable, test_script], check=True, cwd=backend_root)
    except subprocess.CalledProcessError as e:
        print(f"❌ Tests failed with exit code: {e.returncode}")
        sys.exit(1)

if __name__ == "__main__":
    main()
