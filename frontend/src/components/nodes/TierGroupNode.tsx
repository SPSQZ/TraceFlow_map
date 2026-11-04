import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Globe, Server, Layers, Database, Wrench, Folder } from "lucide-react";
import { GraphNodeData } from "../../types";

interface Props {
  data: GraphNodeData;
}

const TIER_ICONS: Record<string, any> = {
  client: Globe,
  gateway: Server,
  service: Layers,
  data: Database,
  utility: Wrench,
};

const TIER_THEMES: Record<string, { border: string; bg: string; text: string; badge: string; glow: string }> = {
  client: {
    border: "border-cyan-500/40",
    bg: "bg-cyan-950/10",
    text: "text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.08)]",
  },
  gateway: {
    border: "border-purple-500/40",
    bg: "bg-purple-950/10",
    text: "text-purple-400",
    badge: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    glow: "shadow-[0_0_30px_rgba(168,85,247,0.08)]",
  },
  service: {
    border: "border-blue-500/40",
    bg: "bg-blue-950/10",
    text: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.08)]",
  },
  data: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-950/10",
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.08)]",
  },
  utility: {
    border: "border-amber-500/40",
    bg: "bg-amber-950/10",
    text: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.08)]",
  },
};

export const TierGroupNode: React.FC<Props> = ({ data }) => {
  const typeKey = (data.tier_type || "service").toLowerCase();
  const theme = TIER_THEMES[typeKey] || TIER_THEMES.service;
  const Icon = TIER_ICONS[typeKey] || Layers;

  const width = data.width || 960;
  const height = data.height || 260;
  const folders = data.folders || [];

  const connectedCount = data.connected_count ?? data.file_count ?? 0;
  const aloneCount = data.alone_count ?? 0;
  const shelfStartY = data.shelf_start_y;

  return (
    <div
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`rounded-2xl border-2 ${theme.border} bg-[#0A0F1D]/60 ${theme.glow} p-5 relative transition-all pointer-events-none select-none`}
    >
      {/* Top and Bottom connection handles for overall tier flow */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-600 !w-3 !h-3 !border-2 !border-slate-800"
      />

      {/* Layer Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 ${theme.text}`}>
            <Icon size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold tracking-wide text-white">{data.title}</h3>
              
              <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                <span className={`px-2 py-0.5 rounded-full border font-bold ${theme.badge}`}>
                  {connectedCount} Connected
                </span>
                {aloneCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full border border-slate-700/80 bg-slate-800/70 text-slate-400 font-semibold">
                    {aloneCount} Standalone
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{data.subtitle}</p>
          </div>
        </div>

        {/* Directory / Folders in this Layer */}
        {folders.length > 0 && (
          <div className="flex items-center space-x-1.5">
            <Folder size={13} className="text-slate-400" />
            <div className="flex flex-wrap gap-1">
              {folders.map((folder: string, idx: number) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700/60"
                >
                  {folder}/
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section Divider for Standalone / Documentation modules */}
      {aloneCount > 0 && shelfStartY && (
        <div
          style={{ top: `${shelfStartY - 24}px` }}
          className="absolute left-6 right-6 flex items-center space-x-3 text-slate-500 text-[10px] font-mono tracking-wider"
        >
          <div className="flex-1 h-[1px] bg-slate-800/90" />
          <span className="px-2.5 py-0.5 rounded-md bg-[#0D121D] border border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            Standalone & Specification Modules ({aloneCount})
          </span>
          <div className="flex-1 h-[1px] bg-slate-800/90" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-600 !w-3 !h-3 !border-2 !border-slate-800"
      />
    </div>
  );
};
