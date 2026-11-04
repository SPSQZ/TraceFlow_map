import React, { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { TierGroupNode } from "./nodes/TierGroupNode";
import { TierNode } from "./nodes/TierNode";
import { FileNode } from "./nodes/FileNode";
import { FlowNode } from "./nodes/FlowNode";
import { GraphResponse } from "../types";

interface Props {
  graphData: GraphResponse | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  isLoading: boolean;
}

const nodeTypes = {
  tierGroupNode: TierGroupNode,
  tierNode: TierNode,
  fileNode: FileNode,
  flowNode: FlowNode,
};

const NODE_WIDTH = 288;
const NODE_HEIGHT = 105;

export const GraphCanvas: React.FC<Props> = ({
  graphData,
  selectedNodeId,
  onSelectNode,
  isLoading,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!graphData || !graphData.nodes) return;

    const rawNodes = graphData.nodes;
    const rawEdges = graphData.edges;

    let layoutedNodes: Node[] = [];
    let layoutedEdges: Edge[] = [];

    // =========================================================================
    // MODE 1: ARCHITECTURE VIEW (Optimized 3-Type Architecture with Dagre LR)
    // Type 1: Cross-layer Entrypoints (Inter-tier)
    // Type 2: Intra-layer Pipelines (connected within layer)
    // Type 3: Alone / Standalone files (shelf below active pipelines)
    // =========================================================================
    if (graphData.mode === "architecture") {
      const tierNodes = rawNodes.filter((n) => n.type === "tierGroupNode");
      const fileNodes = rawNodes.filter((n) => n.type === "fileNode");

      // 1. Map each file to its normalized tier key
      const fileTierMap = new Map<string, string>();
      fileNodes.forEach((f) => {
        const t = (f.tier || f.data?.tier || f.data?.layer || "service").toLowerCase();
        fileTierMap.set(f.id, t);
      });

      // 2. Classify edges: Inter-tier vs Intra-tier
      const interTierNodeIds = new Set<string>();
      const intraTierNodeIds = new Set<string>();
      const intraEdgesByTier = new Map<string, typeof rawEdges>();

      rawEdges.forEach((e) => {
        const sTier = fileTierMap.get(e.source);
        const tTier = fileTierMap.get(e.target);
        if (sTier && tTier) {
          if (sTier !== tTier) {
            interTierNodeIds.add(e.source);
            interTierNodeIds.add(e.target);
          } else {
            intraTierNodeIds.add(e.source);
            intraTierNodeIds.add(e.target);
            if (!intraEdgesByTier.has(sTier)) {
              intraEdgesByTier.set(sTier, []);
            }
            intraEdgesByTier.get(sTier)!.push(e);
          }
        }
      });

      // 3. Classify every file into one of 3 explicit types:
      // - inter_layer (connects across tiers)
      // - intra_layer (connects internally within tier)
      // - alone (standalone / document / isolated script)
      const classifiedFiles = fileNodes.map((fn) => {
        let connectionType: "inter_layer" | "intra_layer" | "alone" = "alone";
        if (interTierNodeIds.has(fn.id)) {
          connectionType = "inter_layer";
        } else if (intraTierNodeIds.has(fn.id)) {
          connectionType = "intra_layer";
        }

        return {
          ...fn,
          connection_type: connectionType,
          data: {
            ...fn.data,
            connection_type: connectionType,
            is_connected: connectionType !== "alone",
          },
        };
      });

      // 4. Pre-calculate widths across tiers to ensure uniform swimlane alignment
      const tierX = 100;
      let globalMaxX = 1320;

      // First pass: Dagre layout on each tier's connected files
      const tierLayoutResults = new Map<
        string,
        {
          connectedFiles: typeof classifiedFiles;
          aloneFiles: typeof classifiedFiles;
          dagreGraph: any;
          maxConnectedX: number;
          maxConnectedY: number;
        }
      >();

      tierNodes.forEach((t) => {
        const tKey = (t.tier || t.data?.tier_type || "").toLowerCase();
        const filesInTier = classifiedFiles.filter(
          (fn) => (fn.tier || fn.data?.tier || "").toLowerCase() === tKey
        );

        const connectedFiles = filesInTier.filter((f) => f.connection_type !== "alone");
        const aloneFiles = filesInTier.filter((f) => f.connection_type === "alone");

        let maxConnectedX = 0;
        let maxConnectedY = 0;
        let g: any = null;

        if (connectedFiles.length > 0) {
          g = new dagre.graphlib.Graph();
          g.setDefaultEdgeLabel(() => ({}));
          g.setGraph({
            rankdir: "LR", // Horizontal Left-to-Right flow within the tier!
            align: "UL",
            nodesep: 75,
            ranksep: 220,
            marginx: 40,
            marginy: 40,
          });

          connectedFiles.forEach((f) => {
            g!.setNode(f.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
          });

          const tierIntraEdges = intraEdgesByTier.get(tKey) || [];
          tierIntraEdges.forEach((e) => {
            if (g!.hasNode(e.source) && g!.hasNode(e.target)) {
              g!.setEdge(e.source, e.target);
            }
          });

          dagre.layout(g);

          connectedFiles.forEach((f) => {
            const pos = g!.node(f.id);
            if (pos) {
              const rightX = pos.x + NODE_WIDTH / 2;
              const bottomY = pos.y + NODE_HEIGHT / 2;
              if (rightX > maxConnectedX) maxConnectedX = rightX;
              if (bottomY > maxConnectedY) maxConnectedY = bottomY;
            }
          });
        }

        if (maxConnectedX + 90 > globalMaxX) globalMaxX = maxConnectedX + 90;

        tierLayoutResults.set(tKey, {
          connectedFiles,
          aloneFiles,
          dagreGraph: g,
          maxConnectedX,
          maxConnectedY,
        });
      });

      const uniformWidth = Math.max(globalMaxX, 4 * (NODE_WIDTH + 30) + 110, 1340);
      let currentY = 50;

      // 5. Build nodes for each Tier Swimlane Container & its files
      tierNodes.forEach((t) => {
        const tKey = (t.tier || t.data?.tier_type || "").toLowerCase();
        const layoutRes = tierLayoutResults.get(tKey);
        if (!layoutRes) return;

        const { connectedFiles, aloneFiles, dagreGraph, maxConnectedY } = layoutRes;

        // Determine shelf start Y for alone files
        const shelfStartY = maxConnectedY > 0 ? maxConnectedY + 80 : 70;
        const aloneCols = 4;
        const aloneRows = Math.ceil(aloneFiles.length / aloneCols);
        const containerHeight = Math.max(
          aloneFiles.length > 0
            ? shelfStartY + aloneRows * (NODE_HEIGHT + 25) + 35
            : maxConnectedY > 0
            ? maxConnectedY + 45
            : 180,
          180
        );

        // A. Add Tier Swimlane Container Node (zIndex -10)
        layoutedNodes.push({
          id: t.id,
          type: "tierGroupNode",
          position: { x: tierX, y: currentY },
          data: {
            ...t.data,
            width: uniformWidth,
            height: containerHeight,
            connected_count: connectedFiles.length,
            alone_count: aloneFiles.length,
            shelf_start_y: aloneFiles.length > 0 && connectedFiles.length > 0 ? shelfStartY : undefined,
          },
          selectable: false,
          draggable: false,
          zIndex: -10,
        });

        // B. Add Connected Files (Dagre Left-to-Right layout)
        connectedFiles.forEach((fileNode) => {
          const pos = dagreGraph ? dagreGraph.node(fileNode.id) : null;
          const fx = pos ? tierX + 40 + (pos.x - NODE_WIDTH / 2) : tierX + 40;
          const fy = pos ? currentY + 70 + (pos.y - NODE_HEIGHT / 2) : currentY + 70;

          layoutedNodes.push({
            id: fileNode.id,
            type: "fileNode",
            position: { x: fx, y: fy },
            data: fileNode.data,
            selected: fileNode.id === selectedNodeId,
            zIndex: 10,
          });
        });

        // C. Add Alone Files in organized 4-column shelf below
        aloneFiles.forEach((fileNode, idx) => {
          const col = idx % aloneCols;
          const row = Math.floor(idx / aloneCols);
          const fx = tierX + 40 + col * (NODE_WIDTH + 30);
          const fy = currentY + shelfStartY + row * (NODE_HEIGHT + 25);

          layoutedNodes.push({
            id: fileNode.id,
            type: "fileNode",
            position: { x: fx, y: fy },
            data: fileNode.data,
            selected: fileNode.id === selectedNodeId,
            zIndex: 10,
          });
        });

        // Advance Y for the next tier with generous buffer
        currentY += containerHeight + 95;
      });

      // 6. Edges for Architecture View with dynamic highlight & routing
      layoutedEdges = rawEdges.map((e) => {
        const isCycle = e.animated && (e.type === "IMPORTS" || e.label?.includes("Cycle"));
        const sTier = fileTierMap.get(e.source);
        const tTier = fileTierMap.get(e.target);
        const isInterTier = sTier && tTier && sTier !== tTier;

        const isConnectedToSelected =
          selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);

        const strokeColor = isCycle
          ? "#F43F5E"
          : isInterTier
          ? "#00F0FF"
          : "#38BDF8";

        const strokeWidth = isConnectedToSelected ? 3.5 : isCycle ? 3 : isInterTier ? 2.5 : 2;
        const opacity = selectedNodeId && !isConnectedToSelected ? 0.25 : 1;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: isInterTier ? "bottom" : "right",
          targetHandle: isInterTier ? "top" : "left",
          type: "default",
          label: e.label,
          animated: e.animated || isCycle || isInterTier,
          zIndex: isConnectedToSelected ? 20 : 5,
          style: {
            stroke: strokeColor,
            strokeWidth,
            opacity,
            filter: isConnectedToSelected
              ? "drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))"
              : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 15,
            height: 15,
          },
          labelStyle: {
            fill: "#F8FAFC",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
          },
          labelBgStyle: {
            fill: "#080E1C",
            fillOpacity: 0.95,
            stroke: strokeColor,
            strokeWidth: 1.5,
          },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
        };
      });
    }

    // =========================================================================
    // MODE 3: DATA FLOW VIEW (Linear Step-by-Step Execution Pipeline)
    // =========================================================================
    else if (graphData.mode === "flow") {
      const spacingY = 210;
      layoutedNodes = rawNodes.map((n, idx) => ({
        id: n.id,
        type: n.type || "flowNode",
        position: { x: 380, y: 60 + idx * spacingY },
        data: n.data,
        selected: n.id === selectedNodeId,
        zIndex: 10,
      }));

      layoutedEdges = rawEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "smoothstep",
        label: e.label,
        animated: true,
        zIndex: 5,
        style: { stroke: "#A855F7", strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#A855F7",
          width: 16,
          height: 16,
        },
        labelStyle: {
          fill: "#FFFFFF",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "JetBrains Mono, monospace",
        },
        labelBgStyle: {
          fill: "#140D2B",
          fillOpacity: 0.95,
          stroke: "#A855F7",
          strokeWidth: 1.5,
        },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 6,
      }));
    }

    // =========================================================================
    // MODE 2: DEPENDENCY VIEW (UE5 BLUEPRINT / COMFYUI LEFT-TO-RIGHT DAG GRAPH)
    // =========================================================================
    else {
      // 1. Separate nodes into connected (active dependency flow) vs standalone (unlinked/docs)
      const pureFileNodes = rawNodes.filter((n) => n.type !== "tierGroupNode");
      const activeEdges = rawEdges.filter((e) => e.source && e.target);

      const edgeSourceIds = new Set(activeEdges.map((e) => e.source));
      const edgeTargetIds = new Set(activeEdges.map((e) => e.target));

      const connectedNodes = pureFileNodes.filter(
        (n) => edgeSourceIds.has(n.id) || edgeTargetIds.has(n.id)
      );
      const standaloneNodes = pureFileNodes.filter(
        (n) => !edgeSourceIds.has(n.id) && !edgeTargetIds.has(n.id)
      );

      // 2. Run Dagre Hierarchical Layout (rankdir: 'LR') on Connected Dependency Pipeline
      const g = new dagre.graphlib.Graph();
      g.setDefaultEdgeLabel(() => ({}));
      g.setGraph({
        rankdir: "LR", // Flow from Left to Right like Unreal Blueprints / ComfyUI!
        align: "UL",
        nodesep: 80,   // Vertical space between cards in the same rank
        ranksep: 260,  // Horizontal breathing room between ranks for wires and chips
        edgesep: 35,
        marginx: 80,
        marginy: 80,
      });

      connectedNodes.forEach((n) => {
        g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      });

      activeEdges.forEach((e) => {
        if (g.hasNode(e.source) && g.hasNode(e.target)) {
          g.setEdge(e.source, e.target);
        }
      });

      if (connectedNodes.length > 0) {
        dagre.layout(g);
      }

      let maxConnectedY = 0;
      let minConnectedX = Infinity;
      let maxConnectedX = 0;

      // Position connected nodes based on Dagre's computed coordinates
      connectedNodes.forEach((n) => {
        const p = g.node(n.id);
        const x = p ? p.x - NODE_WIDTH / 2 : 100;
        const y = p ? p.y - NODE_HEIGHT / 2 : 100;

        if (y + NODE_HEIGHT > maxConnectedY) maxConnectedY = y + NODE_HEIGHT;
        if (x < minConnectedX) minConnectedX = x;
        if (x + NODE_WIDTH > maxConnectedX) maxConnectedX = x + NODE_WIDTH;

        layoutedNodes.push({
          id: n.id,
          type: "fileNode",
          position: { x, y },
          data: {
            ...n.data,
            connection_type: "intra_layer",
            is_connected: true,
          },
          selected: n.id === selectedNodeId,
          zIndex: 10,
        });
      });

      // 3. Position Standalone / Unlinked Modules in a Clean Structured Grid Shelf
      if (standaloneNodes.length > 0) {
        const shelfStartY = maxConnectedY > 0 ? maxConnectedY + 160 : 80;
        const shelfStartX = Math.max(minConnectedX === Infinity ? 80 : minConnectedX, 80);
        const shelfCols = 4;

        standaloneNodes.forEach((n, idx) => {
          const col = idx % shelfCols;
          const row = Math.floor(idx / shelfCols);
          const x = shelfStartX + col * (NODE_WIDTH + 40);
          const y = shelfStartY + row * (NODE_HEIGHT + 25);

          layoutedNodes.push({
            id: n.id,
            type: "fileNode",
            position: { x, y },
            data: {
              ...n.data,
              connection_type: "alone",
              is_connected: false,
            },
            selected: n.id === selectedNodeId,
            zIndex: 10,
          });
        });
      }

      // 4. UE5 / ComfyUI Horizontal Bezier Wires with selection highlight
      layoutedEdges = activeEdges.map((e) => {
        const isCycle = e.animated || (e.label && e.label.toLowerCase().includes("cycle"));
        const strokeColor = isCycle ? "#F43F5E" : "#00F0FF";

        const isConnectedToSelected =
          selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);

        const strokeWidth = isConnectedToSelected ? 3.5 : isCycle ? 2.5 : 2;
        const opacity = selectedNodeId && !isConnectedToSelected ? 0.25 : 1;

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "right", // Exits RIGHT output socket
          targetHandle: "left",  // Enters LEFT input socket
          type: "default",       // Smooth horizontal cubic bezier curve!
          label: e.label,
          animated: isCycle,
          zIndex: isConnectedToSelected ? 20 : 5,
          style: {
            stroke: strokeColor,
            strokeWidth,
            opacity,
            filter: isConnectedToSelected
              ? "drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))"
              : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14,
          },
          labelStyle: {
            fill: "#F8FAFC",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
          },
          labelBgStyle: {
            fill: "#080E1C",
            fillOpacity: 0.95,
            stroke: strokeColor,
            strokeWidth: 1.5,
          },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
        };
      });
    }

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [graphData, selectedNodeId]);

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] relative bg-[#070A10]">
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-[#070A10]/80 flex flex-col items-center justify-center space-y-3 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-cyan-300 tracking-wide font-mono">
            Compiling Blueprint Architecture...
          </span>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#162032" gap={24} size={1} />
        <Controls className="!bg-[#0D121D] !border-slate-800 !fill-slate-300" />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.is_cyclic) return "#F43F5E";
            if (n.data?.connection_type === "inter_layer") return "#00F0FF";
            if (n.data?.layer === "client") return "#00F0FF";
            if (n.data?.layer === "gateway") return "#A855F7";
            if (n.data?.layer === "data") return "#10B981";
            return "#3B82F6";
          }}
          className="!bg-[#0D121D] !border-slate-800"
          maskColor="rgba(7, 10, 16, 0.75)"
        />
      </ReactFlow>

      {/* Floating Canvas Legend */}
      <div className="absolute bottom-5 left-5 z-20 bg-[#0D121D]/90 border border-slate-800/80 rounded-xl px-4 py-2.5 shadow-2xl flex items-center space-x-4 text-[11px] text-slate-300 backdrop-blur-md">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          <span>Cross-Layer Bridge</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
          <span>Intra-Layer Pipeline</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span>Standalone File</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
          <span>Cyclic Dependency</span>
        </div>
      </div>
    </div>
  );
};
