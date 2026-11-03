import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Layers, Globe, Server, Database, Wrench } from "lucide-react";
import { GraphNodeData } from "../../types";

interface Props {
  data: GraphNodeData;
  selected?: boolean;
}

const TIER_ICONS: Record<string, any> = {
  client: Globe,
  gateway: Server,
  service: Layers,
  data: Database,
  utility: Wrench,
};

const TIER_THEMES: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  client: { border: "border-cyan-500/50", bg: "from-cyan-950/40 to-slate-900/90", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", text: "text-cyan-400" },
  gateway: { border: "border-purple-500/50", bg: "from-purple-950/40 to-slate-900/90", badge: "bg-purple-500/20 text-purple-300 border-purple-500/30", text: "text-purple-400" },
  service: { border: "border-blue-500/50", bg: "from-blue-950/40 to-slate-900/90", badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", text: "text-blue-400" },
  data: { border: "border-emerald-500/50", bg: "from-emerald-950/40 to-slate-900/90", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", text: "text-emerald-400" },
  utility: { border: "border-amber-500/50", bg: "from-amber-950/40 to-slate-900/90", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", text: "text-amber-400" },
};

export const TierNode: React.FC<Props> = ({ data, selected }) => {
  const typeKey = (data.tier_type || "service").toLowerCase();
  const theme = TIER_THEMES[typeKey] || TIER_THEMES.service;
  const Icon = TIER_ICONS[typeKey] || Layers;

  return (
    <div
      className={`w-72 rounded-xl border bg-gradient-to-b ${theme.bg} ${theme.border} p-4 shadow-xl backdrop-blur-md transition-all ${
        selected ? "ring-2 ring-cyan-400 shadow-cyan-500/30 scale-105" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 ${theme.text}`}>
            <Icon size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">{data.title}</h4>
            <span className="text-[11px] text-slate-400">{data.subtitle}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badge}`}>
          {data.file_count || 0} Files
        </span>
      </div>

      {data.sample_files && data.sample_files.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5">
          {data.sample_files.map((file, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700/50 truncate max-w-[200px]"
            >
              {file.split("/").pop()}
            </span>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3" />
    </div>
  );
};

