import React, { useState } from "react";
import { GitBranch, Folder, Play, Sparkles, Download, Layers, Network, Activity } from "lucide-react";
import { FlowTrace } from "../types";

interface Props {
  currentMode: "architecture" | "dependency" | "flow";
  onModeChange: (mode: "architecture" | "dependency" | "flow") => void;
  onAnalyze: (target: string, isLocal?: boolean) => void;
  onLoadSample: () => void;
  isLoading: boolean;
  flows: FlowTrace[];
  selectedFlowIndex: number;
  onSelectFlowIndex: (index: number) => void;
  onExport: () => void;
}

export const Header: React.FC<Props> = ({
  currentMode,
  onModeChange,
  onAnalyze,
  onLoadSample,
  isLoading,
  flows,
  selectedFlowIndex,
  onSelectFlowIndex,
  onExport,
}) => {
  const [inputVal, setInputVal] = useState("");
  const [sourceType, setSourceType] = useState<"github" | "local">("github");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onAnalyze(inputVal.trim(), sourceType === "local");
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B0F17]/95 px-5 flex items-center justify-between gap-4 z-20 backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Activity className="text-white w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className="text-base font-extrabold tracking-tight text-white">
              TraceFlow<span className="text-cyan-400 font-light">Map</span>
            </h1>
            <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Codebase-to-Architecture Visualizer</p>
        </div>
      </div>

      {/* Ingestion Input Bar */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-2xl flex items-center space-x-2">
        {/* Source Type Toggle */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setSourceType("github")}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 transition-all ${
              sourceType === "github"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <GitBranch size={12} />
            <span>GitHub</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceType("local")}
            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 transition-all ${
              sourceType === "local"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Folder size={12} />
            <span>Local Folder</span>
          </button>
        </div>

        <div className="relative flex-1">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              sourceType === "github"
                ? "Enter GitHub repo URL (e.g. facebook/react or pallets/flask)"
                : "Enter absolute or relative folder path (e.g. C:\\my-app or ./sample_repo)"
            }
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          {sourceType === "github" ? (
            <GitBranch size={13} className="absolute left-2.5 top-3 text-slate-400" />
          ) : (
            <Folder size={13} className="absolute left-2.5 top-3 text-slate-400" />
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputVal.trim()}
          className="h-9 px-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-500/20 shrink-0"
        >
          <Play size={13} fill="currentColor" />
          <span>Visualize</span>
        </button>

        <button
          type="button"
          onClick={onLoadSample}
          disabled={isLoading}
          className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center space-x-1.5 transition-all shrink-0"
          title="Load pre-built full-stack microservice sample"
        >
          <Sparkles size={13} className="text-cyan-400" />
          <span>Demo Sample</span>
        </button>
      </form>

      {/* Mode Switcher */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            onClick={() => onModeChange("architecture")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              currentMode === "architecture"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={13} />
            <span>Mode 1: Architecture</span>
          </button>

          <button
            onClick={() => onModeChange("dependency")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              currentMode === "dependency"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Network size={13} />
            <span>Mode 2: Dependency</span>
          </button>

          <button
            onClick={() => onModeChange("flow")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              currentMode === "flow"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity size={13} />
            <span>Mode 3: Data Flow</span>
          </button>
        </div>

        {/* In Mode 3: Flow selector */}
        {currentMode === "flow" && flows.length > 0 && (
          <select
            value={selectedFlowIndex}
            onChange={(e) => onSelectFlowIndex(Number(e.target.value))}
            className="h-9 px-2 rounded-lg bg-slate-900 border border-cyan-500/50 text-xs text-cyan-300 font-mono focus:outline-none"
          >
            {flows.map((fl, idx) => (
              <option key={fl.id} value={idx}>
                {fl.title}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={onExport}
          className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center space-x-1.5 transition-all"
          title="Export Architecture / Mermaid"
        >
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
