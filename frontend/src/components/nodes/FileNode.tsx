import React from "react";
import { Handle, Position } from "@xyflow/react";
import { FileCode, AlertTriangle, Cpu } from "lucide-react";
import { GraphNodeData } from "../../types";

interface Props {
  data: GraphNodeData;
  selected?: boolean;
}

const LAYER_BADGES: Record<string, string> = {
  client: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  gateway: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  service: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  data: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  util: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  config: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export const FileNode: React.FC<Props> = ({ data, selected }) => {
  const isCyclic = !!data.is_cyclic;
  const layerKey = (data.layer || "service").toLowerCase();
  const badgeClass = LAYER_BADGES[layerKey] || LAYER_BADGES.service;

  return (
    <div
      className={`w-64 rounded-xl border bg-slate-900/90 p-3 shadow-lg backdrop-blur-md transition-all ${
        isCyclic
          ? "border-rose-500/80 cyclic-node-glow ring-1 ring-rose-500"
          : selected
          ? "border-cyan-400 ring-2 ring-cyan-400/60 shadow-cyan-500/30"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2.5 !h-2.5" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <div
            className={`p-1.5 rounded-lg border ${
              isCyclic
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            {isCyclic ? <AlertTriangle size={15} /> : <FileCode size={15} />}
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-semibold text-white truncate" title={data.path}>
              {data.filename || data.path?.split("/").pop()}
            </h5>
            <span className="text-[10px] text-slate-400 font-mono truncate block" title={data.path}>
              {data.path}
            </span>
          </div>
        </div>

        {isCyclic && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/50 uppercase tracking-wider shrink-0">
            Cycle
          </span>
        )}
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-medium capitalize ${badgeClass}`}>
          {data.layer}
        </span>
        <div className="flex items-center space-x-2 font-mono">
          <span>{data.lines || 0} LOC</span>
          <span className="text-slate-600">•</span>
          <span className="uppercase text-slate-500">{data.language}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2.5 !h-2.5" />
    </div>
  );
};

