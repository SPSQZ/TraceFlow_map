#!/usr/bin/env python
"""
TraceFlow Map - Quickstart Runner
Usage:
    python run.py             # Starts the FastAPI backend & visualization server (port 8005)
    python run.py --test      # Runs test suite verifying all code intelligence engines
"""
import sys
import io
import subprocess
from pathlib import Path

# Safe UTF-8 output handling for Windows terminals
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.config import PORT, HOST

def run_tests():
    print("Running TraceFlow Map test suite...")
    cmd = [sys.executable, "-m", "pytest", "backend/tests", "-v"]
    result = subprocess.run(cmd, cwd=BASE_DIR)
    sys.exit(result.returncode)

def run_server():
    print("=" * 65)
    print("  [+] TraceFlow Map - Codebase-to-Architecture Visualizer")
    print("  AI + Developer Tools + Code Intelligence Engine")
    print("=" * 65)
    print(f"Starting server at http://localhost:{PORT} ...")
    print(f"Interactive Swagger Docs at http://localhost:{PORT}/docs")
    print("=" * 65)
    
    cmd = [
        sys.executable, "-m", "uvicorn",
        "backend.main:app",
        "--host", HOST,
        "--port", str(PORT),
        "--reload"
    ]
    subprocess.run(cmd, cwd=BASE_DIR)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        run_server()
