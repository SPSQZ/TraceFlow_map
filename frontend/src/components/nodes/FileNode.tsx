import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  FileCode,
  AlertTriangle,
  Layers,
  Cpu,
  Database,
  Terminal,
  Settings,
  GitCommit,
  Share2,
} from "lucide-react";
import { GraphNodeData } from "../../types";

interface Props {
  data: GraphNodeData;
  selected?: boolean;
}

const LAYER_CONFIGS: Record<
  string,
  {
    headerGradient: string;
    badgeBorder: string;
    badgeText: string;
    icon: React.ReactNode;
  }
> = {
  client: {
    headerGradient: "from-cyan-600/90 via-cyan-800/80 to-slate-900 border-b border-cyan-400/40 text-cyan-200",
    badgeBorder: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    badgeText: "CLIENT",
    icon: <Terminal size={14} className="text-cyan-300" />,
  },
  gateway: {
    headerGradient: "from-purple-600/90 via-purple-900/80 to-slate-900 border-b border-purple-400/40 text-purple-200",
    badgeBorder: "border-purple-500/40 bg-purple-500/10 text-purple-300",
    badgeText: "GATEWAY",
    icon: <Layers size={14} className="text-purple-300" />,
  },
  service: {
    headerGradient: "from-blue-600/90 via-blue-900/80 to-slate-900 border-b border-blue-400/40 text-blue-200",
    badgeBorder: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    badgeText: "SERVICE",
    icon: <Cpu size={14} className="text-blue-300" />,
  },
  data: {
    headerGradient: "from-emerald-600/90 via-teal-900/80 to-slate-900 border-b border-emerald-400/40 text-emerald-200",
    badgeBorder: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    badgeText: "DATA",
    icon: <Database size={14} className="text-emerald-300" />,
  },
  util: {
    headerGradient: "from-amber-600/90 via-amber-900/80 to-slate-900 border-b border-amber-400/40 text-amber-200",
    badgeBorder: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    badgeText: "UTIL",
    icon: <Settings size={14} className="text-amber-300" />,
  },
  config: {
    headerGradient: "from-slate-600/90 via-slate-800/80 to-slate-900 border-b border-slate-500/40 text-slate-300",
    badgeBorder: "border-slate-500/40 bg-slate-500/10 text-slate-300",
    badgeText: "CONFIG",
    icon: <FileCode size={14} className="text-slate-300" />,
  },
};

export const FileNode: React.FC<Props> = ({ data, selected }) => {
  const isCyclic = !!data.is_cyclic;
  const layerKey = (data.layer || "service").toLowerCase();
  const config = LAYER_CONFIGS[layerKey] || LAYER_CONFIGS.service;

  const filename = data.filename || data.path?.split("/").pop() || "File";
  const parentFolder = data.path && data.path.includes("/")
    ? data.path.substring(0, data.path.lastIndexOf("/"))
    : "";

  const connType = data.connection_type || (data.is_connected ? "intra_layer" : "alone");
  const isInterLayer = connType === "inter_layer";
  const isAlone = connType === "alone";

  return (
    <div
      className={`w-72 rounded-xl border bg-[#0D121D] shadow-2xl transition-all select-none overflow-hidden ${
        isCyclic
          ? "border-rose-500 ring-2 ring-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.45)]"
          : selected
          ? "border-cyan-400 ring-2 ring-cyan-400/90 shadow-[0_0_28px_rgba(6,182,212,0.6)]"
          : isInterLayer
          ? "border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-cyan-950/30"
          : isAlone
          ? "border-slate-800/60 opacity-85 hover:opacity-100"
          : "border-slate-800/90 hover:border-slate-600 hover:shadow-cyan-950/20"
      }`}
    >
      {/* =================================================================== */}
      {/* COMBO HANDLES: LEFT (IN) & RIGHT (OUT) for DAG / BLUEPRINT FLOW     */}
      {/* TOP & BOTTOM for Cross-Tier vertical connections                    */}
      {/* =================================================================== */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3.5 !h-3.5 !-left-[7px] !bg-[#090D16] !border-2 !border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3.5 !h-3.5 !-right-[7px] !bg-[#090D16] !border-2 !border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] hover:!scale-125 transition-transform"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !-top-[5px] !bg-[#090D16] !border-2 !border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !-bottom-[5px] !bg-[#090D16] !border-2 !border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
      />

      {/* =================================================================== */}
      {/* UE5 BLUEPRINT HEADER BAR                                            */}
      {/* =================================================================== */}
      <div
        className={`px-3 py-2 bg-gradient-to-r flex items-center justify-between ${
          isCyclic
            ? "from-rose-600 via-rose-950 to-slate-900 border-b border-rose-400/50 text-rose-100"
            : config.headerGradient
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-1 rounded bg-black/40 border border-white/10 shrink-0">
            {isCyclic ? (
              <AlertTriangle size={14} className="text-rose-300 animate-pulse" />
            ) : isInterLayer ? (
              <Share2 size={14} className="text-cyan-300" />
            ) : (
              config.icon
            )}
          </div>
          <span
            className="text-xs font-bold text-white font-mono truncate max-w-[140px]"
            title={filename}
          >
            {filename}
          </span>
        </div>

        {/* Dynamic Role Badge: Cross-Layer / Cycle / Layer */}
        {isCyclic ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-rose-500/30 text-rose-200 border border-rose-400/60 animate-pulse tracking-wider shrink-0">
            CYCLE
          </span>
        ) : isInterLayer ? (
          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold font-mono bg-cyan-400/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.4)] tracking-wide shrink-0 flex items-center space-x-1">
            <span>✦ CROSS-LAYER</span>
          </span>
        ) : isAlone ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono bg-slate-800/80 text-slate-400 border border-slate-700/60 tracking-wider shrink-0">
            ALONE
          </span>
        ) : (
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border tracking-wider shrink-0 ${config.badgeBorder}`}
          >
            {config.badgeText}
          </span>
        )}
      </div>

      {/* =================================================================== */}
      {/* NODE BODY & PIN LABELS (ComfyUI / Blueprint Sockets)                */}
      {/* =================================================================== */}
      <div className="p-2.5 space-y-2 bg-[#0A0E17]/95">
        {/* Input / Output Socket Indicators */}
        <div className="flex items-center justify-between text-[9px] font-mono font-semibold tracking-wider text-slate-500 px-0.5">
          <span className="flex items-center space-x-1 text-cyan-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>IN</span>
          </span>
          <span className="flex items-center space-x-1 text-emerald-400/80">
            <span>OUT</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
        </div>

        {/* Directory / Path Chip */}
        <div
          className="px-2 py-1 rounded bg-black/60 border border-slate-800/90 text-[10px] font-mono text-slate-400 truncate hover:text-slate-200 transition-colors"
          title={data.path}
        >
          {parentFolder ? (
            <>
              <span className="text-slate-600">{parentFolder}/</span>
              <span className="text-slate-300">{filename}</span>
            </>
          ) : (
            <span className="text-slate-300">{data.path || filename}</span>
          )}
        </div>

        {/* Footer Meta: LOC & Language */}
        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="text-slate-400">
            <span className="text-white font-semibold">{data.lines ?? 0}</span> LOC
          </span>

          <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[9px] text-slate-300 uppercase tracking-wide">
            {data.language || "code"}
          </span>
        </div>
      </div>
    </div>
  );
};
