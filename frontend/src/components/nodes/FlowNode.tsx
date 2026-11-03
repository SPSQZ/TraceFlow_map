import React from "react";
import { Handle, Position } from "@xyflow/react";
import { ArrowRightCircle, Database, Server, Globe, Cpu } from "lucide-react";
import { GraphNodeData } from "../../types";

interface Props {
  data: GraphNodeData;
  selected?: boolean;
}

const TIER_ICONS: Record<string, any> = {
  client: Globe,
  gateway: Server,
  service: Cpu,
  data: Database,
};

export const FlowNode: React.FC<Props> = ({ data, selected }) => {
  const tierKey = (data.tier || "service").toLowerCase();
  const Icon = TIER_ICONS[tierKey] || ArrowRightCircle;

  return (
    <div
      className={`w-72 rounded-xl border bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md transition-all ${
        selected
          ? "border-cyan-400 ring-2 ring-cyan-400/60 shadow-cyan-500/40"
          : "border-slate-800 hover:border-cyan-500/50"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2.5 !h-2.5" />

      <div className="flex items-center space-x-2.5 mb-2">
        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center text-xs font-bold font-mono">
          {data.step || 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              {data.tier} Tier
            </span>
            <Icon size={14} className="text-slate-400" />
          </div>
          <h4 className="text-xs font-bold text-white font-mono truncate" title={data.name}>
            {data.name}
          </h4>
        </div>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed mb-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
        {data.description}
      </p>

      {data.file && (
        <div className="text-[10px] font-mono text-slate-400 truncate">
          <span className="text-slate-500">file:</span> {data.file}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2.5 !h-2.5" />
    </div>
  );
};

