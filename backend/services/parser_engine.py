import ast
import re
from typing import List, Dict, Any, Tuple
from ..models.schemas import SymbolInfo

class ParserEngine:
    @staticmethod
    def parse_python(file_path: str, content: str) -> Tuple[List[SymbolInfo], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parses Python file using Python's AST.
        Returns:
            symbols: List[SymbolInfo]
            imports: List[{source: str, imported_symbol: str, line: int}]
            calls: List[{caller: str, callee: str, line: int}]
            routes: List[{method: str, path: str, handler: str, line: int}]
        """
        symbols: List[SymbolInfo] = []
        imports: List[Dict[str, Any]] = []
        calls: List[Dict[str, Any]] = []
        routes: List[Dict[str, Any]] = []

        try:
            tree = ast.parse(content, filename=file_path)
        except Exception:
            return symbols, imports, calls, routes

        # First pass: collect imports
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append({
                        "source": alias.name,
                        "imported_symbol": alias.asname or alias.name,
                        "line": node.lineno
                    })
            elif isinstance(node, ast.ImportFrom):
                source = node.module or ""
                for alias in node.names:
                    imports.append({
                        "source": source,
                        "imported_symbol": alias.name,
                        "alias": alias.asname or alias.name,
                        "line": node.lineno
                    })

        # Second pass: functions and classes
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_calls = []
                for sub in ast.walk(node):
                    if isinstance(sub, ast.Call):
                        callee_name = ""
                        if isinstance(sub.func, ast.Name):
                            callee_name = sub.func.id
                        elif isinstance(sub.func, ast.Attribute):
                            callee_name = sub.func.attr
                        if callee_name:
                            func_calls.append(callee_name)
                            calls.append({
                                "caller": node.name,
                                "callee": callee_name,
                                "line": sub.lineno
                            })

                # Check route decorators (e.g. @app.get("/users"), @router.post("/login"))
                for dec in node.decorator_list:
                    if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                        method = dec.func.attr.upper()
                        if method in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                            route_path = "/"
                            if dec.args and isinstance(dec.args[0], ast.Constant):
                                route_path = str(dec.args[0].value)
                            routes.append({
                                "method": method,
                                "path": route_path,
                                "handler": node.name,
                                "line": node.lineno
                            })

                params = [arg.arg for arg in node.args.args]
                doc = ast.get_docstring(node)
                symbols.append(
                    SymbolInfo(
                        name=node.name,
                        kind="function",
                        file=file_path,
                        start_line=node.lineno,
                        end_line=node.end_lineno or node.lineno,
                        params=params,
                        exported=True,
                        calls=list(set(func_calls)),
                        docstring=doc
                    )
                )

            elif isinstance(node, ast.ClassDef):
                doc = ast.get_docstring(node)
                methods = [m.name for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
                symbols.append(
                    SymbolInfo(
                        name=node.name,
                        kind="class",
                        file=file_path,
                        start_line=node.lineno,
                        end_line=node.end_lineno or node.lineno,
                        params=methods,
                        exported=True,
                        calls=[],
                        docstring=doc
                    )
                )

        return symbols, imports, calls, routes

    @staticmethod
    def parse_javascript_typescript(file_path: str, content: str) -> Tuple[List[SymbolInfo], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Parses JS/TS/JSX/TSX code using regex token matching.
        """
        symbols: List[SymbolInfo] = []
        imports: List[Dict[str, Any]] = []
        calls: List[Dict[str, Any]] = []
        routes: List[Dict[str, Any]] = []

        lines = content.splitlines()

        # 1. Imports: import { a, b } from './path' or import c from './path'
        import_pattern = re.compile(r"""import\s+(?:\{([^}]+)\}|(\w+)|(?:\*\s+as\s+(\w+)))\s+from\s+['"]([^'"]+)['"]""")
        require_pattern = re.compile(r"""(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)""")

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()
            # Match ES6 imports
            for m in import_pattern.finditer(line_str):
                named, default_sym, star_sym, source = m.groups()
                if named:
                    for sym in named.split(","):
                        sym_clean = sym.strip().split(" as ")[0].strip()
                        if sym_clean:
                            imports.append({"source": source, "imported_symbol": sym_clean, "line": idx})
                elif default_sym:
                    imports.append({"source": source, "imported_symbol": default_sym.strip(), "line": idx})
                elif star_sym:
                    imports.append({"source": source, "imported_symbol": star_sym.strip(), "line": idx})

            # Match require()
            for m in require_pattern.finditer(line_str):
                named, default_sym, source = m.groups()
                if named:
                    for sym in named.split(","):
                        if sym.strip():
                            imports.append({"source": source, "imported_symbol": sym.strip(), "line": idx})
                elif default_sym:
                    imports.append({"source": source, "imported_symbol": default_sym.strip(), "line": idx})

            # Match Express/Router routes: app.post("/api/register", registerHandler) or router.get(...)
            route_match = re.search(r"""(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*,\s*([a-zA-Z0-9_]+)?""", line_str)
            if route_match:
                method, route_path, handler = route_match.groups()
                routes.append({
                    "method": method.upper(),
                    "path": route_path,
                    "handler": handler or "anonymous",
                    "line": idx
                })

            # Match client fetch calls: fetch("/api/checkout", ...)
            client_fetch = re.search(r"""fetch\s*\(\s*['"]([^'"]+)['"]""", line_str)
            if client_fetch:
                routes.append({
                    "method": "CLIENT_FETCH",
                    "path": client_fetch.group(1),
                    "handler": "client_call",
                    "line": idx
                })

        # 2. Extract Functions and Classes
        func_regex = re.compile(r"""(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)""")
        arrow_regex = re.compile(r"""(?:export\s+)?(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*[^=]+)?\s*=>""")
        class_regex = re.compile(r"""(?:export\s+)?class\s+([a-zA-Z0-9_]+)""")

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()
            is_exported = "export" in line_str

            # Functions
            m_func = func_regex.search(line_str)
            if m_func:
                name, raw_params = m_func.groups()
                params = [p.strip().split(":")[0].strip() for p in raw_params.split(",") if p.strip()]
                symbols.append(
                    SymbolInfo(
                        name=name,
                        kind="function",
                        file=file_path,
                        start_line=idx,
                        end_line=min(idx + 15, len(lines)),
                        params=params,
                        exported=is_exported,
                        calls=[]
                    )
                )

            # Arrow Functions
            m_arrow = arrow_regex.search(line_str)
            if m_arrow:
                name, raw_params = m_arrow.groups()
                params = [p.strip().split(":")[0].strip() for p in raw_params.split(",") if p.strip()]
                symbols.append(
                    SymbolInfo(
                        name=name,
                        kind="function",
                        file=file_path,
                        start_line=idx,
                        end_line=min(idx + 15, len(lines)),
                        params=params,
                        exported=is_exported,
                        calls=[]
                    )
                )

            # Classes
            m_class = class_regex.search(line_str)
            if m_class:
                name = m_class.group(1)
                symbols.append(
                    SymbolInfo(
                        name=name,
                        kind="class",
                        file=file_path,
                        start_line=idx,
                        end_line=min(idx + 30, len(lines)),
                        params=[],
                        exported=is_exported,
                        calls=[]
                    )
                )

        # 3. Call references across the file
        all_sym_names = {s.name for s in symbols}
        call_regex = re.compile(r"""\b([a-zA-Z0-9_]+)\s*\(""")
        for idx, line in enumerate(lines, 1):
            for match in call_regex.finditer(line):
                callee = match.group(1)
                if callee not in ["if", "while", "for", "switch", "catch", "function", "require", "import"]:
                    calls.append({
                        "caller": "file_scope",
                        "callee": callee,
                        "line": idx
                    })

        return symbols, imports, calls, routes

