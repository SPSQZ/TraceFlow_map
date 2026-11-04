from typing import List, Dict, Any, Optional
from ..models.schemas import GraphNode, GraphEdge, GraphResponse, FileMeta

class GraphEngine:
    @staticmethod
    def build_architecture_view(
        files: List[FileMeta],
        resolved_imports: List[Dict[str, Any]],
        circular_cycles: List[List[str]] = []
    ) -> GraphResponse:
        """
        Mode 1: High-level architectural view with swimlane containers and nested files.
        Tiers:
          - Client Layer (Frontend)
          - Gateway Layer (API & Routing)
          - Service Layer (Business Logic)
          - Data Layer (Databases & Persistence)
          - Utility Layer (Config & Helpers)
        """
        tier_order = ["Client", "Gateway", "Service", "Data", "Utility"]
        tier_subtitles = {
            "Client": "Frontend UI components & client fetchers",
            "Gateway": "API Gateway, route listeners & request controllers",
            "Service": "Domain business logic & core microservices",
            "Data": "Data models, schemas & persistence repositories",
            "Utility": "Shared utilities, configs & build manifests",
        }

        cyclic_files = {item for cycle in circular_cycles for item in cycle}
        tier_files: Dict[str, List[FileMeta]] = {t: [] for t in tier_order}

        for f in files:
            layer_cap = f.layer.capitalize()
            if layer_cap not in tier_order:
                layer_cap = "Service" if f.layer != "config" else "Utility"
            tier_files[layer_cap].append(f)

        nodes: List[GraphNode] = []

        # 1. Add Tier Group Container Nodes
        for tier in tier_order:
            flist = tier_files[tier]
            if len(flist) > 0 or tier in ["Client", "Gateway", "Service", "Data"]:
                folders = sorted(list({
                    "/".join(f.path.split("/")[:-1])
                    for f in flist
                    if "/" in f.path
                }))
                if not folders and flist:
                    folders = ["root"]

                nodes.append(
                    GraphNode(
                        id=f"tier_group_{tier.lower()}",
                        type="tierGroupNode",
                        label=f"{tier} Layer",
                        tier=tier,
                        data={
                            "title": f"{tier} Layer",
                            "subtitle": tier_subtitles.get(tier, f"{tier} components"),
                            "tier_type": tier.lower(),
                            "folders": folders,
                            "file_count": len(flist)
                        }
                    )
                )

        # 2. Add individual File Nodes inside each tier
        for tier in tier_order:
            for f in tier_files[tier]:
                is_cyclic = f.path in cyclic_files
                folder = "/".join(f.path.split("/")[:-1]) if "/" in f.path else "."
                nodes.append(
                    GraphNode(
                        id=f.path,
                        type="fileNode",
                        label=f.path.split("/")[-1],
                        tier=tier,
                        file=f.path,
                        data={
                            "path": f.path,
                            "filename": f.path.split("/")[-1],
                            "folder": folder,
                            "language": f.language,
                            "layer": f.layer,
                            "lines": f.lines,
                            "is_cyclic": is_cyclic,
                            "size": f.size,
                            "tier": tier
                        }
                    )
                )

        # 3. Add Edges between files (both intra-layer and inter-layer!)
        edges: List[GraphEdge] = []
        edge_set = set()
        file_tier_map = {f.path: f.layer.capitalize() for f in files}

        for imp in resolved_imports:
            src = imp.get("from_file")
            tgt = imp.get("target_file")
            if src and tgt and src in file_tier_map and tgt in file_tier_map and src != tgt:
                edge_key = (src, tgt)
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    src_tier = file_tier_map[src]
                    tgt_tier = file_tier_map[tgt]
                    is_inter_tier = (src_tier != tgt_tier)
                    is_cycle_edge = (src in cyclic_files and tgt in cyclic_files)

                    edge_label = imp.get("symbol") or ("calls" if is_inter_tier else "imports")

                    edges.append(
                        GraphEdge(
                            id=f"arch_e_{src}_{tgt}".replace("/", "_").replace(".", "_"),
                            source=src,
                            target=tgt,
                            type="ROUTES_TO" if is_inter_tier else "IMPORTS",
                            label=edge_label,
                            animated=is_inter_tier or is_cycle_edge,
                            line=imp.get("line")
                        )
                    )

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            mode="architecture",
            metrics={
                "total_tiers": len([t for t in tier_order if tier_files[t]]),
                "total_files": len(files),
                "intra_layer_edges": len([e for e in edges if not e.animated]),
                "inter_layer_edges": len([e for e in edges if e.animated])
            }
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
