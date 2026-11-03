from typing import List, Dict, Any, Tuple
from ..models.schemas import SymbolInfo

class CallGraphEngine:
    @staticmethod
    def build_call_graph(
        symbols_by_file: Dict[str, List[SymbolInfo]],
        resolved_imports: List[Dict[str, Any]],
        calls_by_file: Dict[str, List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """
        Connects calls in File A to symbol definitions in File B.
        Returns:
            List of call edges:
            {
                "caller_file": str,
                "caller_symbol": str,
                "callee_file": str,
                "callee_symbol": str,
                "line": int
            }
        """
        # Map: file_path -> { symbol_name: SymbolInfo }
        symbol_index: Dict[str, Dict[str, SymbolInfo]] = {}
        for fpath, syms in symbols_by_file.items():
            symbol_index[fpath] = {s.name: s for s in syms}

        # Map: (from_file, imported_symbol) -> target_file
        import_map: Dict[Tuple[str, str], str] = {}
        for imp in resolved_imports:
            from_file = imp.get("from_file")
            target_file = imp.get("target_file")
            sym = imp.get("symbol")
            if from_file and target_file and sym:
                import_map[(from_file, sym)] = target_file

        edges: List[Dict[str, Any]] = []

        for fpath, calls in calls_by_file.items():
            for c in calls:
                callee_name = c["callee"]
                caller_sym = c.get("caller", "file_scope")
                line = c.get("line", 0)

                # Check if callee is imported from another file
                if (fpath, callee_name) in import_map:
                    target_file = import_map[(fpath, callee_name)]
                    edges.append({
                        "caller_file": fpath,
                        "caller_symbol": caller_sym,
                        "callee_file": target_file,
                        "callee_symbol": callee_name,
                        "line": line
                    })
                # Check if callee is in the same file
                elif fpath in symbol_index and callee_name in symbol_index[fpath]:
                    edges.append({
                        "caller_file": fpath,
                        "caller_symbol": caller_sym,
                        "callee_file": fpath,
                        "callee_symbol": callee_name,
                        "line": line
                    })

        return edges

