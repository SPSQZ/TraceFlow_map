import React, { useState } from "react";
import {
  Code2,
  FolderTree,
  AlertTriangle,
  Flame,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { Overview, Issues, GraphNode } from "../types";

interface Props {
  overview: Overview | null;
  issues: Issues | null;
  files: any[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export const LeftSidebar: React.FC<Props> = ({
  overview,
  issues,
  files,
  selectedNodeId,
  onSelectNode,
}) => {
  const [search, setSearch] = useState("");
  const [issuesOpen, setIssuesOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-80 border-r border-slate-800 bg-[#0B0F17]/95 flex flex-col h-[calc(100vh-4rem)] z-10 select-none">
      {/* Repo Metadata Header */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-white truncate" title={overview?.repo_name || "Repository"}>
          {overview?.repo_name || "No Repository Selected"}
        </h2>

        {/* Stack Badges */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {overview?.stack.map((item, idx) => (
            <span
              key={idx}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700/80"
            >
              {item}
            </span>
          ))}
        </div>

        {/* Architectural Pattern */}
        {overview?.architecture_patterns && overview.architecture_patterns.length > 0 && (
          <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-purple-400 font-medium">
            <Layers size={13} />
            <span>{overview.architecture_patterns[0]}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="block text-xs font-bold text-white font-mono">
              {overview?.total_files || 0}
            </span>
            <span className="text-[10px] text-slate-400">Files</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="block text-xs font-bold text-white font-mono">
              {overview?.total_lines.toLocaleString() || 0}
            </span>
            <span className="text-[10px] text-slate-400">LOC</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="block text-xs font-bold text-white font-mono">
              {overview?.total_symbols || 0}
            </span>
            <span className="text-[10px] text-slate-400">Symbols</span>
          </div>
        </div>
      </div>

      {/* Scrollable Accordions */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {/* Architecture Issues & Circular Dependencies */}
        <div className="p-3">
          <button
            onClick={() => setIssuesOpen(!issuesOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
          >
            <div className="flex items-center space-x-2">
              <ShieldAlert size={14} className="text-amber-400" />
              <span>Architectural Issues</span>
            </div>
            <div className="flex items-center space-x-1.5">
              {issues && issues.circular_dependencies.length > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {issues.circular_dependencies.length} Cycles
                </span>
              )}
              {issuesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </button>

          {issuesOpen && (
            <div className="mt-3 space-y-2">
              {/* Circular Dependencies */}
              {issues?.circular_dependencies.map((cycle, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30 cursor-pointer hover:border-rose-400 transition-all"
                  onClick={() => onSelectNode(cycle[0])}
                >
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-rose-300">
                    <AlertTriangle size={13} />
                    <span>Circular Dependency #{i + 1}</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-slate-300 flex flex-col space-y-0.5">
                    {cycle.map((node, j) => (
                      <div key={j} className="truncate">
                        {j > 0 ? "↳ " : "• "}
                        <span className="text-rose-200">{node.split("/").pop()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* God Files / Bottlenecks */}
              {issues?.god_files.map((gf, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 cursor-pointer hover:border-amber-400 transition-all"
                  onClick={() => onSelectNode(gf.file)}
                >
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-amber-300">
                    <Flame size={13} />
                    <span>High Coupling Hub</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-slate-200 truncate">
                    {gf.file}
                  </p>
                  <span className="text-[10px] text-slate-400">{gf.reason}</span>
                </div>
              ))}

              {(!issues || (issues.circular_dependencies.length === 0 && issues.god_files.length === 0)) && (
                <p className="text-[11px] text-slate-500 italic p-1">
                  No critical circular dependencies detected.
                </p>
              )}
            </div>
          )}
        </div>

        {/* File Explorer */}
        <div className="p-3">
          <button
            onClick={() => setFilesOpen(!filesOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white mb-2"
          >
            <div className="flex items-center space-x-2">
              <FolderTree size={14} className="text-cyan-400" />
              <span>Project Files ({files.length})</span>
            </div>
            {filesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {filesOpen && (
            <div>
              {/* Search box */}
              <div className="relative mb-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter files..."
                  className="w-full h-7 pl-7 pr-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <Search size={12} className="absolute left-2 top-2 text-slate-500" />
              </div>

              {/* File list */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => onSelectNode(file.path)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      selectedNodeId === file.path
                        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className="truncate font-mono text-[11px]">
                      {file.path}
                    </span>
                    <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400 ml-1 shrink-0">
                      {file.language}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

