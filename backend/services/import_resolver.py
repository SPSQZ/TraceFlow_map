from pathlib import Path
from typing import Dict, List, Optional

class ImportResolver:
    @staticmethod
    def resolve(source_import: str, current_file_path: str, known_files: Dict[str, Any]) -> Optional[str]:
        """
        Resolves an import source string (e.g. '../services/authService') relative to current_file_path
        against the dictionary of known project files.
        """
        clean_source = source_import.strip()
        curr_dir = Path(current_file_path).parent

        # 1. Relative imports starting with . or ..
        if clean_source.startswith("."):
            base_target = (curr_dir / clean_source).as_posix()
            
            # Normalize target (remove any ./ or resolve ../)
            parts = base_target.split("/")
            normalized_parts = []
            for p in parts:
                if p == "..":
                    if normalized_parts:
                        normalized_parts.pop()
                elif p != "." and p != "":
                    normalized_parts.append(p)
            resolved_base = "/".join(normalized_parts)

            # Direct match
            if resolved_base in known_files:
                return resolved_base

            # Try common extensions
            for ext in [".ts", ".tsx", ".js", ".jsx", ".py", ".json"]:
                candidate = resolved_base + ext
                if candidate in known_files:
                    return candidate

            # Try directory index file
            for index_file in ["/index.ts", "/index.tsx", "/index.js", "/index.jsx", "/__init__.py"]:
                candidate = resolved_base + index_file
                if candidate in known_files:
                    return candidate

        # 2. Alias imports (e.g. @/services/..., ~/..., src/...)
        if clean_source.startswith("@/") or clean_source.startswith("~/"):
            stripped = clean_source[2:]
            candidates = [
                stripped,
                f"src/{stripped}",
                f"app/{stripped}"
            ]
            for c in candidates:
                for ext in ["", ".ts", ".tsx", ".js", ".jsx", ".py"]:
                    cand = (c + ext).replace("//", "/")
                    if cand in known_files:
                        return cand

        # 3. Direct filename match anywhere in known files (heuristic for Python or root imports)
        filename_only = clean_source.split("/")[-1]
        for f in known_files.keys():
            if f.endswith(f"/{filename_only}.py") or f.endswith(f"/{filename_only}.ts") or f.endswith(f"/{filename_only}.js"):
                return f

        return None

