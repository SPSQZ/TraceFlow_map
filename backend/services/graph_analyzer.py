import networkx as nx
from typing import List, Dict, Any, Tuple
from ..models.schemas import FileMeta, GraphEdge

class GraphAnalyzer:
    @staticmethod
    def analyze(files: List[FileMeta], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Runs NetworkX graph analytics:
          - Detects circular dependencies (cycles)
          - Detects God files / central hubs via in-degree & PageRank
          - Detects orphan / isolated files
        """
        G = nx.DiGraph()

        # Add all files as nodes
        for f in files:
            G.add_node(f.path, lines=f.lines, layer=f.layer)

        # Add edges
        for e in edges:
            src = e.get("from_file")
            tgt = e.get("target_file")
            if src and tgt and src != tgt and G.has_node(src) and G.has_node(tgt):
                G.add_edge(src, tgt)

        # 1. Circular Dependencies (Cycles)
        circular_cycles = []
        try:
            raw_cycles = list(nx.simple_cycles(G))
            # Limit to top 10 cycles to prevent explosion
            circular_cycles = [c for c in raw_cycles if len(c) > 1][:10]
        except Exception:
            circular_cycles = []

        # 2. Central Hubs / God Files (PageRank & In-Degree)
        central_hubs = []
        god_files = []
        if len(G.nodes) > 0:
            try:
                pagerank = nx.pagerank(G, alpha=0.85)
            except Exception:
                pagerank = {n: 0.0 for n in G.nodes}

            for node in G.nodes:
                in_deg = G.in_degree(node)
                out_deg = G.out_degree(node)
                lines = G.nodes[node].get("lines", 0)

                # Flag high-dependency hubs
                if in_deg >= 2:
                    central_hubs.append({
                        "file": node,
                        "in_degree": in_deg,
                        "pagerank": round(pagerank.get(node, 0) * 100, 2)
                    })

                # God file heuristics: high lines + high connections
                if lines > 250 or (in_deg + out_deg) > 6:
                    god_files.append({
                        "file": node,
                        "lines": lines,
                        "connections": in_deg + out_deg,
                        "reason": f"High coupling ({in_deg + out_deg} connections, {lines} lines)"
                    })

            central_hubs.sort(key=lambda x: x["in_degree"], reverse=True)
            god_files.sort(key=lambda x: x["connections"], reverse=True)

        # 3. Orphan / Isolated Files
        orphans = [
            n for n in G.nodes 
            if G.in_degree(n) == 0 and G.out_degree(n) == 0 and not n.endswith(".json") and not n.endswith(".md")
        ]

        return {
            "circular_dependencies": circular_cycles,
            "central_hubs": central_hubs[:8],
            "god_files": god_files[:6],
            "orphans": orphans[:10],
            "graph_density": round(nx.density(G), 3) if len(G.nodes) > 1 else 0.0
        }

    @staticmethod
    def find_path(edges: List[Dict[str, Any]], start_node: str, end_node: str) -> List[str]:
        """
        Finds shortest path between two nodes in the dependency graph.
        """
        G = nx.DiGraph()
        for e in edges:
            src = e.get("from_file")
            tgt = e.get("target_file")
            if src and tgt:
                G.add_edge(src, tgt)

        if not G.has_node(start_node) or not G.has_node(end_node):
            return []

        try:
            return nx.shortest_path(G, source=start_node, target=end_node)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []

