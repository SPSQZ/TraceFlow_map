import os
from pathlib import Path
from typing import List, Dict, Tuple
from ..config import DEFAULT_EXCLUDE_DIRS, SUPPORTED_EXTENSIONS, MAX_FILES, MAX_FILE_SIZE_BYTES
from ..models.schemas import FileMeta

LANGUAGE_MAP = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".sql": "sql",
    ".prisma": "prisma",
}

class RepoScanner:
    @staticmethod
    def classify_layer(path_str: str) -> str:
        """
        Classifies file into an architectural tier based on conventions and names.
        Tiers: client, gateway, service, data, util, config
        """
        lower = path_str.lower().replace("\\", "/")
        parts = lower.split("/")
        filename = parts[-1]

        # Config files
        if any(filename.startswith(c) for c in ["package.json", "tsconfig", "docker", "vite.config", "next.config", "requirements", "pyproject"]):
            return "config"

        # Client / Frontend
        if any(k in lower for k in ["frontend", "client", "components", "pages", "views", "ui", "styles", "app/page", "src/app"]):
            return "client"
        if filename.endswith(".tsx") or filename.endswith(".jsx"):
            return "client"

        # API Gateway / Controllers / Routes
        if any(k in lower for k in ["routes", "controllers", "endpoints", "api", "router", "gateway", "handlers"]):
            return "gateway"

        # Service / Domain logic
        if any(k in lower for k in ["service", "services", "manager", "managers", "usecases", "domain", "logic", "workflow"]):
            return "service"

        # Data / DB / Models
        if any(k in lower for k in ["models", "schema", "database", "db", "repository", "repositories", "entities", "prisma"]):
            return "data"

        # Utilities / Helpers
        if any(k in lower for k in ["utils", "helpers", "lib", "common", "shared", "tools"]):
            return "util"

        return "service" if any(filename.endswith(ext) for ext in [".py", ".ts", ".js", ".go"]) else "other"

    @classmethod
    def scan(cls, root_dir: Path) -> Tuple[List[FileMeta], Dict[str, str]]:
        """
        Scans directory, returns list of FileMeta and dictionary of {rel_path: content_str}
        """
        files_meta: List[FileMeta] = []
        file_contents: Dict[str, str] = {}
        count = 0

        for root, dirs, files in os.walk(root_dir):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in DEFAULT_EXCLUDE_DIRS and not d.startswith(".")]

            for file in sorted(files):
                if count >= MAX_FILES:
                    break

                ext = Path(file).suffix.lower()
                if ext not in SUPPORTED_EXTENSIONS and file not in ["Dockerfile"]:
                    continue

                full_path = Path(root) / file
                try:
                    size = full_path.stat().st_size
                    if size > MAX_FILE_SIZE_BYTES or size == 0:
                        continue

                    # Read text content safely
                    with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()

                    rel_path = str(full_path.relative_to(root_dir)).replace("\\", "/")
                    lines = len(content.splitlines())
                    layer = cls.classify_layer(rel_path)
                    lang = LANGUAGE_MAP.get(ext, "text")

                    file_contents[rel_path] = content
                    files_meta.append(
                        FileMeta(
                            path=rel_path,
                            language=lang,
                            size=size,
                            lines=lines,
                            layer=layer,
                            symbols_count=0,
                        )
                    )
                    count += 1
                except Exception:
                    continue

        return files_meta, file_contents

