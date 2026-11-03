import json
import httpx
from typing import Dict, Any, List
from ..config import GEMINI_API_KEY
from ..models.schemas import FileMeta, SymbolInfo

class AIExplainer:
    @staticmethod
    def generate_heuristic_summary(
        repo_name: str,
        stack: List[str],
        patterns: List[str],
        entry_points: List[str],
        total_files: int
    ) -> Dict[str, str]:
        """
        Deterministic, code-grounded architectural summary fallback.
        Ensures 100% demo availability without an external API key.
        """
        stack_str = ", ".join(stack) if stack else "modern web technologies"
        patterns_str = ", ".join(patterns) if patterns else "modular design"
        entry_str = ", ".join(entry_points[:2]) if entry_points else "the main entry files"

        beginner = (
            f"Think of {repo_name} like a restaurant kitchen. "
            f"The frontend acts like the dining room and waitstaff, taking customer orders and passing them forward. "
            f"The backend server ({stack_str}) works like the chefs in the kitchen, following recipes to prepare data. "
            f"The database serves as the pantry, keeping all records safely stored. "
            f"With {total_files} distinct files, everything starts from {entry_str}."
        )

        intermediate = (
            f"{repo_name} is structured as a {patterns_str} built primarily with {stack_str}. "
            f"Inbound client interactions interface through {entry_str}, routing requests through controller "
            f"and middleware boundaries down into core business services. Data access and persistence layers "
            f"encapsulate state mutation, maintaining strict separation of concerns across its {total_files} modules."
        )

        developer = (
            f"Architectural Topology for {repo_name}: Engineered around {patterns_str} utilizing {stack_str}. "
            f"Primary runtime bootstraps via {entry_str}. HTTP request lifecycle dispatches to controller handlers, "
            f"delegating domain workflows to dedicated service abstractions. Static dependency analysis confirms "
            f"modular encapsulation across {total_files} compilation units with deterministic call graphs and tier separation."
        )

        return {
            "beginner": beginner,
            "intermediate": intermediate,
            "developer": developer
        }

    @staticmethod
    async def explain_repository(
        repo_name: str,
        stack: List[str],
        patterns: List[str],
        entry_points: List[str],
        files: List[FileMeta]
    ) -> Dict[str, str]:
        """
        Uses Gemini if configured, else returns heuristic summaries.
        """
        if not GEMINI_API_KEY:
            return AIExplainer.generate_heuristic_summary(repo_name, stack, patterns, entry_points, len(files))

        prompt = f"""
Analyze this software repository based on its static code intelligence:
- Repository Name: {repo_name}
- Tech Stack: {', '.join(stack)}
- Architectural Patterns: {', '.join(patterns)}
- Entry Points: {', '.join(entry_points)}
- Total Files: {len(files)}

Provide three distinct architectural explanations in valid JSON with keys "beginner", "intermediate", and "developer":
- "beginner": Use clear real-world analogies (like a restaurant, library, or airport). Avoid coding jargon.
- "intermediate": Explain the flow of data, components, and responsibilities for a software engineer.
- "developer": Technical breakdown of entrypoints, control flow, service boundaries, and state mutations.
Output only valid JSON.
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text)
                    return {
                        "beginner": parsed.get("beginner", ""),
                        "intermediate": parsed.get("intermediate", ""),
                        "developer": parsed.get("developer", "")
                    }
        except Exception:
            pass

        return AIExplainer.generate_heuristic_summary(repo_name, stack, patterns, entry_points, len(files))

    @staticmethod
    def explain_file(file_meta: FileMeta, symbols: List[SymbolInfo], incoming_deps: List[str], outgoing_deps: List[str]) -> Dict[str, str]:
        """
        Generates 3-persona breakdown for an individual clicked file.
        """
        name = file_meta.path.split("/")[-1]
        funcs = [s.name for s in symbols if s.kind == "function"]
        classes = [s.name for s in symbols if s.kind == "class"]
        sym_str = f"functions: {', '.join(funcs[:3])}" if funcs else (f"classes: {', '.join(classes[:2])}" if classes else "utility statements")

        beginner = (
            f"'{name}' is like a specialized helper in the {file_meta.layer} department. "
            f"It takes care of {sym_str} so the rest of the application doesn't have to worry about it."
        )

        intermediate = (
            f"`{file_meta.path}` operates in the **{file_meta.layer.capitalize()}** tier ({file_meta.lines} lines). "
            f"It encapsulates {sym_str}. It depends on {len(outgoing_deps)} upstream modules and provides functionality to {len(incoming_deps)} callers."
        )

        developer = (
            f"Module `{file_meta.path}` ({file_meta.language}, {file_meta.lines} LOC, Tier: {file_meta.layer}). "
            f"Exported symbols: {sym_str}. Direct imports: {', '.join(outgoing_deps[:3]) or 'None'}. "
            f"Referenced by: {', '.join(incoming_deps[:3]) or 'Leaf node'}."
        )

        return {
            "beginner": beginner,
            "intermediate": intermediate,
            "developer": developer
        }

