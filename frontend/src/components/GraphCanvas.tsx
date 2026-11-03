import React, { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
  tierNode: TierNode,
  fileNode: FileNode,
  flowNode: FlowNode,
};

export const GraphCanvas: React.FC<Props> = ({
  graphData,
  selectedNodeId,
  onSelectNode,
  isLoading,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Compute hierarchical or tier layout when graphData changes
  useEffect(() => {
    if (!graphData || !graphData.nodes) return;

    const rawNodes = graphData.nodes;
    const rawEdges = graphData.edges;

    // Layout based on mode
    let layoutedNodes: Node[] = [];

    if (graphData.mode === "architecture") {
      // 4 horizontal or vertical tiers
      const spacingY = 180;
      layoutedNodes = rawNodes.map((n, idx) => ({
        id: n.id,
        type: n.type || "tierNode",
        position: { x: 300, y: 50 + idx * spacingY },
        data: n.data,
        selected: n.id === selectedNodeId,
      }));
    } else if (graphData.mode === "flow") {
      // Linear downward flow
      const spacingY = 190;
      layoutedNodes = rawNodes.map((n, idx) => ({
        id: n.id,
        type: n.type || "flowNode",
        position: { x: 300, y: 50 + idx * spacingY },
        data: n.data,
        selected: n.id === selectedNodeId,
      }));
    } else {
      // Dependency view: Group nodes by layer into vertical columns
      const layerColumns: Record<string, number> = {
        client: 50,
        gateway: 350,
        service: 650,
        data: 950,
        util: 1250,
        config: 1250,
      };
      const columnCounts: Record<string, number> = {
        client: 0,
        gateway: 0,
        service: 0,
        data: 0,
        util: 0,
        config: 0,
      };

      layoutedNodes = rawNodes.map((n) => {
        const layer = (n.data.layer || "service").toLowerCase();
        const colX = layerColumns[layer] !== undefined ? layerColumns[layer] : 650;
        const rowY = (columnCounts[layer] || 0) * 110 + 50;
        columnCounts[layer] = (columnCounts[layer] || 0) + 1;

        return {
          id: n.id,
          type: n.type || "fileNode",
          position: { x: colX, y: rowY },
          data: n.data,
          selected: n.id === selectedNodeId,
        };
      });
    }

    const layoutedEdges: Edge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: e.animated,
      style: {
        stroke: e.animated ? "#00F0FF" : "#4B5563",
        strokeWidth: e.animated ? 2.5 : 1.5,
      },
      labelStyle: { fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" },
      labelBgStyle: { fill: "#0F172A", fillOpacity: 0.8 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    }));

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [graphData, selectedNodeId]);

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] relative bg-[#0B0F17]">
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-[#0B0F17]/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-xs font-semibold text-cyan-300 tracking-wide font-mono">
            Constructing Architecture Graph...
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
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1E293B" gap={20} size={1} />
        <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300" />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.is_cyclic) return "#F43F5E";
            if (n.data?.layer === "client") return "#00F0FF";
            if (n.data?.layer === "gateway") return "#A855F7";
            if (n.data?.layer === "data") return "#10B981";
            return "#3B82F6";
          }}
          className="!bg-slate-900 !border-slate-800"
          maskColor="rgba(11, 15, 23, 0.7)"
        />
      </ReactFlow>

      {/* Floating Canvas Legend */}
      <div className="absolute bottom-5 left-5 z-20 bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 shadow-xl backdrop-blur-md flex items-center space-x-4 text-[11px] text-slate-300">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Client Tier</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          <span>Gateway / Route</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span>Service Logic</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Data Store</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Cyclic Dependency</span>
        </div>
      </div>
    </div>
  );
};

