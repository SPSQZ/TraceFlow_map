import json
from typing import List, Dict, Tuple
from ..models.schemas import FileMeta

class StackDetector:
    @staticmethod
    def detect(files: List[FileMeta], file_contents: Dict[str, str]) -> Tuple[List[str], List[str], List[str]]:
        """
        Returns:
            stack: List of identified technologies and frameworks
            patterns: List of architectural patterns detected
            entry_points: List of likely entry point files
        """
        stack = set()
        patterns = set()
        entry_points = []
        file_paths = {f.path for f in files}

        # 1. Inspect package.json
        for path in file_paths:
            if path.endswith("package.json"):
                try:
                    data = json.loads(file_contents.get(path, "{}"))
                    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                    if "next" in deps:
                        stack.add("Next.js")
                        stack.add("React")
                    elif "react" in deps:
                        stack.add("React")
                    if "express" in deps:
                        stack.add("Express")
                    if "fastify" in deps:
                        stack.add("Fastify")
                    if "nestjs" in deps or "@nestjs/core" in deps:
                        stack.add("NestJS")
                    if "prisma" in deps or "@prisma/client" in deps:
                        stack.add("Prisma ORM")
                    if "mongoose" in deps:
                        stack.add("Mongoose (MongoDB)")
                    if "pg" in deps:
                        stack.add("PostgreSQL")
                    if "tailwindcss" in deps:
                        stack.add("Tailwind CSS")
                    if "typescript" in deps:
                        stack.add("TypeScript")
                    stack.add("Node.js")
                except Exception:
                    pass

            # 2. Inspect Python requirements / pyproject
            if path.endswith("requirements.txt") or path.endswith("pyproject.toml"):
                stack.add("Python")
                content = file_contents.get(path, "").lower()
                if "fastapi" in content:
                    stack.add("FastAPI")
                if "flask" in content:
                    stack.add("Flask")
                if "django" in content:
                    stack.add("Django")
                if "sqlalchemy" in content:
                    stack.add("SQLAlchemy")
                if "pydantic" in content:
                    stack.add("Pydantic")
                if "celery" in content:
                    stack.add("Celery")

            # 3. Containers
            if "dockerfile" in path.lower() or "docker-compose" in path.lower():
                stack.add("Docker")

        # Fallback language detections
        for f in files:
            if f.language == "typescript":
                stack.add("TypeScript")
            elif f.language == "python":
                stack.add("Python")
            elif f.language == "javascript":
                stack.add("JavaScript")
            elif f.language == "go":
                stack.add("Go")

        # 4. Pattern Detection
        has_client = any(f.layer == "client" for f in files)
        has_gateway = any(f.layer == "gateway" for f in files)
        has_service = any(f.layer == "service" for f in files)
        has_data = any(f.layer == "data" for f in files)

        if has_client and (has_gateway or has_service):
            patterns.add("Client-Server Architecture")
        if has_gateway and has_service and has_data:
            patterns.add("Layered / Tiered Architecture")
        if any("controller" in f.path.lower() for f in files) and any("model" in f.path.lower() for f in files):
            patterns.add("Model-View-Controller (MVC)")
        if any("docker-compose" in f.path.lower() for f in files) or len([f for f in files if "service" in f.path.lower()]) > 4:
            patterns.add("Microservices / Service-Oriented")
        if not patterns:
            patterns.add("Modular Monolith")

        # 5. Detect Entry Points
        common_entries = [
            "main.py", "app.py", "server.py", "index.ts", "server.ts", 
            "main.ts", "src/index.ts", "src/main.ts", "app/page.tsx", 
            "src/App.tsx", "index.js", "server.js"
        ]
        for f in files:
            path_lower = f.path.lower()
            for ce in common_entries:
                if path_lower.endswith(ce):
                    entry_points.append(f.path)
                    break

        return sorted(list(stack)), sorted(list(patterns)), list(dict.fromkeys(entry_points))[:6]

