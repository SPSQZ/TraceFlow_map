from typing import List, Dict, Any, Optional
from ..models.schemas import GraphNode, GraphEdge, GraphResponse, FileMeta

class GraphEngine:
    @staticmethod
    def build_architecture_view(files: List[FileMeta], resolved_imports: List[Dict[str, Any]]) -> GraphResponse:
        """
        Mode 1: High-level architectural view.
        Tiers:
          - Client Layer (Web / Mobile)
          - Gateway / Routing Layer
          - Service Layer (Business Logic)
          - Data Layer (Databases / Schemas / Models)
          - Utilities & Config
        """
        tier_order = ["Client", "Gateway", "Service", "Data", "Utility"]
        tier_names = {
            "client": "Client Layer (Frontend)",
            "gateway": "API Gateway & Routing",
            "service": "Service & Business Logic",
            "data": "Data & Persistence Layer",
            "util": "Utilities & Helpers",
            "config": "Config & Manifests",
        }

        tier_nodes = {}
        tier_counts = {t: 0 for t in tier_order}
        tier_files: Dict[str, List[str]] = {t: [] for t in tier_order}

        for f in files:
            layer_cap = f.layer.capitalize()
            if layer_cap not in tier_order:
                layer_cap = "Service"
            tier_counts[layer_cap] += 1
            tier_files[layer_cap].append(f.path)

        nodes: List[GraphNode] = []
        # Create a visual node for each tier that has files
        for idx, tier in enumerate(tier_order):
            if tier_counts[tier] > 0 or tier in ["Client", "Gateway", "Service", "Data"]:
                node_id = f"tier_{tier.lower()}"
                desc = f"{tier_counts[tier]} modules / components"
                nodes.append(
                    GraphNode(
                        id=node_id,
                        type="tierNode",
                        label=f"{tier} Tier",
                        tier=tier,
                        data={
                            "title": f"{tier} Layer",
                            "subtitle": desc,
                            "file_count": tier_counts[tier],
                            "sample_files": tier_files[tier][:4],
                            "tier_type": tier.lower()
                        }
                    )
                )

        # Inter-tier connections
        edges: List[GraphEdge] = [
            GraphEdge(id="e_client_gateway", source="tier_client", target="tier_gateway", type="ROUTES_TO", label="HTTP Requests", animated=True),
            GraphEdge(id="e_gateway_service", source="tier_gateway", target="tier_service", type="CALLS", label="Dispatches Business Logic", animated=True),
            GraphEdge(id="e_service_data", source="tier_service", target="tier_data", type="READS_WRITES", label="Queries & Persists", animated=True),
            GraphEdge(id="e_service_util", source="tier_service", target="tier_utility", type="USES", label="Shared Utilities", animated=False),
        ]

        # Filter edges to only exist if both source and target exist
        existing_ids = {n.id for n in nodes}
        valid_edges = [e for e in edges if e.source in existing_ids and e.target in existing_ids]

        return GraphResponse(
            nodes=nodes,
            edges=valid_edges,
            mode="architecture",
            metrics={"total_tiers": len(nodes), "total_files": len(files)}
        )

    @staticmethod
    def build_dependency_view(
        files: List[FileMeta],
        resolved_imports: List[Dict[str, Any]],
        circular_cycles: List[List[str]] = []
    ) -> GraphResponse:
        """
        Mode 2: Dependency view showing file-to-file imports and module connections.
        """
        nodes: List[GraphNode] = []
        # Set of files involved in circular dependencies
        cyclic_files = set()
        for cycle in circular_cycles:
            for item in cycle:
                cyclic_files.add(item)

        for f in files:
            node_id = f.path
            is_cyclic = node_id in cyclic_files
            nodes.append(
                GraphNode(
                    id=node_id,
                    type="fileNode",
                    label=f.path.split("/")[-1],
                    tier=f.layer.capitalize(),
                    file=f.path,
                    data={
                        "path": f.path,
                        "filename": f.path.split("/")[-1],
                        "language": f.language,
                        "layer": f.layer,
                        "lines": f.lines,
                        "is_cyclic": is_cyclic,
                        "size": f.size
                    }
                )
            )

        # Build edges from resolved imports
        edges: List[GraphEdge] = []
        edge_set = set()
        file_set = {f.path for f in files}

        for idx, imp in enumerate(resolved_imports):
            src = imp.get("from_file")
            tgt = imp.get("target_file")
            if src and tgt and src in file_set and tgt in file_set and src != tgt:
                edge_key = (src, tgt)
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    
                    # Highlight cycle edges in red
                    is_cycle_edge = (src in cyclic_files and tgt in cyclic_files)
                    
                    edges.append(
                        GraphEdge(
                            id=f"e_{src}_{tgt}".replace("/", "_").replace(".", "_"),
                            source=src,
                            target=tgt,
                            type="IMPORTS",
                            label=imp.get("symbol", "imports"),
                            animated=is_cycle_edge,
                            line=imp.get("line")
                        )
                    )

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            mode="dependency",
            metrics={
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "circular_cycle_count": len(circular_cycles)
            }
        )

    @staticmethod
    def build_flow_view(flow_traces: List[Dict[str, Any]], active_flow_index: int = 0) -> GraphResponse:
        """
        Mode 3: Execution and data flow view for a selected flow trace.
        """
        if not flow_traces:
            return GraphResponse(nodes=[], edges=[], mode="flow", metrics={})

        active_flow = flow_traces[active_flow_index % len(flow_traces)]
        steps = active_flow.get("steps", [])

        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []

        for idx, step in enumerate(steps):
            node_id = f"flow_step_{idx + 1}"
            nodes.append(
                GraphNode(
                    id=node_id,
                    type="flowNode",
                    label=step["name"],
                    tier=step.get("tier", "Service"),
                    file=step.get("file"),
                    data={
                        "step": step["step"],
                        "name": step["name"],
                        "tier": step.get("tier", "Service"),
                        "file": step.get("file", ""),
                        "description": step.get("description", "")
                    }
                )
            )

            if idx > 0:
                prev_id = f"flow_step_{idx}"
                edges.append(
                    GraphEdge(
                        id=f"e_flow_{idx}_{idx+1}",
                        source=prev_id,
                        target=node_id,
                        type="FLOWS_TO",
                        label=f"Step {idx} → {idx + 1}",
                        animated=True
                    )
                )

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            mode="flow",
            metrics={
                "flow_title": active_flow.get("title", ""),
                "total_steps": len(steps)
            }
        )

