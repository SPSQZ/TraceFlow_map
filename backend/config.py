import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from project root if present
load_dotenv(BASE_DIR / ".env")

WORKSPACE_DIR = BASE_DIR / "workspaces"
SAMPLE_REPO_DIR = BASE_DIR / "sample_repo"

WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

# AI Provider Configuration
# "auto" (tries Ollama first, then Gemini, then AST heuristics)
AI_PROVIDER = os.environ.get("AI_PROVIDER", "auto").strip().lower()

# Local Ollama Configuration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b").strip()

# Gemini Cloud API Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

# Server Port (8005)
PORT = int(os.environ.get("PORT", 8005))
HOST = os.environ.get("HOST", "0.0.0.0")

# Limits to keep processing fast and safe during demos
MAX_FILES = int(os.environ.get("MAX_FILES", 400))
MAX_FILE_SIZE_BYTES = int(os.environ.get("MAX_FILE_SIZE_BYTES", 1024 * 1024))  # 1MB
DEFAULT_EXCLUDE_DIRS = {
    "node_modules", ".git", "dist", "build", "coverage", ".next", 
    "venv", ".venv", "__pycache__", ".idea", ".vscode", "target", "bin", "obj"
}
SUPPORTED_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml", 
    ".md", ".go", ".rs", ".java", ".sql", ".prisma"
}
