from typing import List, Dict, Any, Optional

class DataflowEngine:
    @staticmethod
    def extract_flows(
        routes: List[Dict[str, Any]],
        call_edges: List[Dict[str, Any]],
        files_by_layer: Dict[str, List[str]]
    ) -> List[Dict[str, Any]]:
        """
        Reconstructs execution flows from entry routes down to services and database.
        Returns:
            List of flow traces:
            {
                "id": str,
                "title": str,
                "entry_endpoint": str,
                "method": str,
                "steps": [
                    {"step": 1, "tier": "Client", "name": "...", "file": "...", "description": "..."},
                    ...
                ]
            }
        """
        flows = []
        # Build quick adjacency map for function calls: (file, func) -> [(target_file, target_func)]
        adj: Dict[str, List[Dict[str, Any]]] = {}
        for edge in call_edges:
            src_key = f"{edge['caller_file']}::{edge['caller_symbol']}"
            if src_key not in adj:
                adj[src_key] = []
            adj[src_key].append(edge)

        # For each API route, trace downstream steps
        for idx, route in enumerate(routes):
            method = route.get("method", "GET")
            path = route.get("path", "/")
            handler = route.get("handler", "anonymous")
            route_file = route.get("file", "api")

            flow_id = f"flow_{idx + 1}"
            title = f"{method} {path}"

            steps = [
                {
                    "step": 1,
                    "tier": "Client",
                    "name": f"HTTP {method} {path}",
                    "file": "frontend/client",
                    "description": f"Client dispatches {method} request to endpoint {path}"
                },
                {
                    "step": 2,
                    "tier": "Gateway",
                    "name": f"{handler}()",
                    "file": route_file,
                    "description": f"Route listener intercepts request and routes to {handler} in {route_file}"
                }
            ]

            # Follow calls from handler
            visited_keys = {f"{route_file}::{handler}"}
            current_key = f"{route_file}::{handler}"
            step_num = 3

            # Also check file-level calls from this route file
            calls_to_check = adj.get(current_key, []) + adj.get(f"{route_file}::file_scope", [])
            for c in calls_to_check:
                target_f = c["callee_file"]
                target_sym = c["callee_symbol"]
                target_key = f"{target_f}::{target_sym}"

                if target_key not in visited_keys and step_num <= 6:
                    visited_keys.add(target_key)
                    
                    tier = "Service"
                    desc = f"Executes business logic in {target_sym}()"
                    if "model" in target_f.lower() or "db" in target_f.lower() or "repo" in target_f.lower():
                        tier = "Data"
                        desc = f"Performs database query or transaction via {target_sym}()"

                    steps.append({
                        "step": step_num,
                        "tier": tier,
                        "name": f"{target_sym}()",
                        "file": target_f,
                        "description": desc
                    })
                    step_num += 1

            # If no data step was reached, add an implicit database persist step if path looks like a write
            if method in ["POST", "PUT", "DELETE"] and not any(s["tier"] == "Data" for s in steps):
                steps.append({
                    "step": step_num,
                    "tier": "Data",
                    "name": "Database Commit / Write",
                    "file": "Database",
                    "description": "Persists state updates to database and commits transaction"
                })

            flows.append({
                "id": flow_id,
                "title": title,
                "entry_endpoint": path,
                "method": method,
                "steps": steps
            })

        return flows

