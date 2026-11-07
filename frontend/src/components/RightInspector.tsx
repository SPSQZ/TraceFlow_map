import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Code,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Layers,
  Send,
  Bot,
  CornerDownRight,
  X,
  Maximize2,
  Minimize2,
  GripVertical,
  ChevronLeft,
} from "lucide-react";
import { FileDetails, ChatMessage } from "../types";
import { askQuestion } from "../api";

interface Props {
  analysisId: string | null;
  selectedNodeId: string | null;
  fileDetails: FileDetails | null;
  onSelectNode: (nodeId: string) => void;
  activeTab: "inspect" | "code" | "chat";
  onTabChange: (tab: "inspect" | "code" | "chat") => void;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 384;

export const RightInspector: React.FC<Props> = ({
  analysisId,
  selectedNodeId,
  fileDetails,
  onSelectNode,
  activeTab,
  onTabChange,
}) => {
  const [persona, setPersona] = useState<"beginner" | "intermediate" | "developer">("intermediate");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "👋 Hi! I'm TraceFlow Map's AI Assistant. Ask me anything about this codebase's architecture, dependencies, or execution flows.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Panel width (drag-to-resize) ────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(DEFAULT_WIDTH);

  // ── Popout / Fullscreen modal ────────────────────────────────────────────
  const [isPopout, setIsPopout] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAsking]);

  // ── Drag Resize Handlers ─────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartW.current = panelWidth;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, [panelWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX; // drag left = wider
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartW.current + delta));
      setPanelWidth(newW);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ── Chat Send ─────────────────────────────────────────────────────────────
  const handleSendChat = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || !analysisId) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: "user",
      text: q,
      persona,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsAsking(true);

    try {
      const res = await askQuestion(analysisId, q, persona, selectedNodeId || undefined);
      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: res.answer,
        persona: res.persona,
        referenced_files: res.referenced_files,
        referenced_symbols: res.referenced_symbols,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "ai",
          text: "⚠️ Failed to query AI assistant. Ensure the backend is running.",
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  // ── Collapsed state: show only a thin tab bar ─────────────────────────────
  if (isCollapsed) {
    return (
      <div className="relative flex flex-col items-center w-10 h-[calc(100vh-4rem)] border-l border-slate-800 bg-[#0B0F17]/95 z-10 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Panel"
          className="mt-3 p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
        >
          <ChevronLeft size={16} className="rotate-180" />
        </button>
        {["inspect", "code", "chat"].map((t) => (
          <button
            key={t}
            onClick={() => { setIsCollapsed(false); onTabChange(t as any); }}
            title={t.charAt(0).toUpperCase() + t.slice(1)}
            className={`mt-2 p-1.5 rounded-lg transition-all ${
              activeTab === t ? "text-cyan-400 bg-slate-800" : "text-slate-500 hover:text-white"
            }`}
          >
            {t === "inspect" && <FileText size={15} />}
            {t === "code" && <Code size={15} />}
            {t === "chat" && <MessageSquare size={15} />}
          </button>
        ))}
      </div>
    );
  }

  // ── Inner panel content (shared between sidebar & popout) ─────────────────
  const renderPanelContent = () => (
    <>
      {/* Tab Navigation */}
      <div className="h-11 border-b border-slate-800 flex items-center px-2 bg-slate-900/60 shrink-0">
        {(["inspect", "code", "chat"] as const).map((tab, i) => {
          const labels = ["Inspector", "Code Viewer", "Ask AI"];
          const icons = [<FileText size={13} />, <Code size={13} />, <MessageSquare size={13} />];
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === tab
                  ? "bg-slate-800 text-cyan-400 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {icons[i]}
              <span>{labels[i]}</span>
            </button>
          );
        })}

        {/* Collapse / Expand / Popout controls */}
        <div className="flex items-center space-x-1 ml-2 shrink-0">
          <button
            onClick={() => setIsPopout(!isPopout)}
            title={isPopout ? "Dock panel" : "Pop out panel"}
            className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-all"
          >
            {isPopout ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse panel"
            className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-all"
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>

      {/* ── Tab 1: Node Inspector ─────────────────────────────────────────── */}
      {activeTab === "inspect" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {fileDetails ? (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Inspecting File
                </span>
                <h3 className="text-sm font-bold text-white font-mono break-all mt-0.5">
                  {fileDetails.path}
                </h3>
              </div>

              {/* Persona Selector */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-300">
                    <Sparkles size={13} />
                    <span>Learning Persona</span>
                  </div>
                  <span className="text-[9px] text-slate-400 capitalize">{persona} Level</span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                  {(["beginner", "intermediate", "developer"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPersona(p)}
                      className={`py-1 rounded text-[10px] font-bold capitalize transition-all ${
                        persona === p ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  {fileDetails.ai_explanation[persona] ||
                    fileDetails.ai_explanation.intermediate ||
                    "Analyzing file architecture..."}
                </p>
              </div>

              {/* Symbols */}
              {fileDetails.symbols && fileDetails.symbols.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                    <Code size={13} className="text-cyan-400" />
                    <span>Contained Symbols ({fileDetails.symbols.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {fileDetails.symbols.map((sym, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-cyan-300 font-semibold block truncate">
                            {sym.name}()
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">{sym.kind}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          L{sym.start_line}–{sym.end_line}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Module Connections */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Layers size={13} className="text-blue-400" />
                  <span>Module Connections</span>
                </h4>
                <div className="space-y-2">
                  {[
                    { label: "Depends On", deps: fileDetails.outgoing_deps, color: "text-slate-300" },
                    { label: "Referenced By", deps: fileDetails.incoming_deps, color: "text-cyan-300" },
                  ].map(({ label, deps, color }) => (
                    <div key={label}>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {label} ({deps.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {deps.map((dep, i) => (
                          <button
                            key={i}
                            onClick={() => onSelectNode(dep)}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 ${color} border border-slate-700/60 truncate max-w-[200px]`}
                          >
                            {dep.split("/").pop()}
                          </button>
                        ))}
                        {deps.length === 0 && (
                          <span className="text-[10px] text-slate-500 italic">None</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FileText size={32} className="mb-2 text-slate-600" />
              <p className="text-xs">Click any node in the graph to inspect its architecture and dependencies.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Code Viewer ───────────────────────────────────────────── */}
      {activeTab === "code" && (
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-[#06090F]">
          {fileDetails ? (
            <div className="space-y-0.5">
              <div className="pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{fileDetails.path}</span>
                <span className="uppercase">{fileDetails.language}</span>
              </div>
              {fileDetails.content.split("\n").map((line, idx) => (
                <div key={idx} className="flex hover:bg-slate-800/40 px-1 rounded">
                  <span className="w-9 shrink-0 text-slate-600 select-none text-right pr-3">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 whitespace-pre overflow-x-auto">{line || " "}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select a file node to view source code.
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Ask AI Chat ───────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Persona bar */}
          <div className="p-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 shrink-0">
            <span className="text-[10px] font-semibold text-slate-400">Response Level:</span>
            <div className="flex space-x-1">
              {(["beginner", "intermediate", "developer"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPersona(p)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                    persona === p ? "bg-cyan-500 text-slate-950 font-extrabold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[92%] p-2.5 rounded-xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-cyan-500 text-slate-950 font-medium rounded-br-none"
                      : "bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.referenced_files && msg.referenced_files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.referenced_files.map((rf, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectNode(rf)}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 flex items-center space-x-1 hover:border-cyan-400"
                      >
                        <CornerDownRight size={10} />
                        <span>{rf.split("/").pop()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isAsking && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 p-2 italic">
                <Bot size={14} className="animate-pulse text-cyan-400" />
                <span>Traversing graph & generating explanation...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/30 flex flex-wrap gap-1 shrink-0">
            {[
              "How does authentication work?",
              "Trace checkout order flow",
              "Show circular dependencies",
            ].map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(qp)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Ask about this codebase..."
                className="w-full h-9 pl-3 pr-9 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={isAsking || !inputQuery.trim()}
                className="absolute right-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── POPOUT MODAL ─────────────────────────────────────────────────────────
  if (isPopout) {
    return (
      <>
        {/* Thin collapsed sidebar placeholder so layout doesn't shift */}
        <div className="w-10 border-l border-slate-800 bg-[#0B0F17]/95 shrink-0" />

        {/* Floating resizable modal */}
        <div
          className="fixed inset-0 z-50 flex items-start justify-end p-4 pointer-events-none"
        >
          <div
            style={{ width: `${panelWidth}px`, maxWidth: "95vw" }}
            className="pointer-events-auto h-[calc(100vh-2rem)] bg-[#0B0F17] border border-slate-700 rounded-2xl shadow-2xl shadow-black/70 flex flex-col overflow-hidden"
          >
            {/* Popout drag handle strip + close */}
            <div
              className="h-7 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-3 cursor-move shrink-0"
              onMouseDown={onMouseDown}
            >
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                <GripVertical size={12} />
                <span>INSPECTOR — drag to resize</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsPopout(false)}
                  title="Dock panel"
                  className="p-0.5 rounded text-slate-500 hover:text-cyan-400"
                >
                  <Minimize2 size={13} />
                </button>
                <button
                  onClick={() => { setIsPopout(false); setIsCollapsed(true); }}
                  title="Close"
                  className="p-0.5 rounded text-slate-500 hover:text-rose-400"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {renderPanelContent()}
          </div>
        </div>
      </>
    );
  }

  // ── DEFAULT SIDEBAR ───────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] shrink-0" style={{ width: `${panelWidth}px` }}>
      {/* Drag Resize Handle (left edge of panel) */}
      <div
        onMouseDown={onMouseDown}
        title="Drag to resize"
        className="w-1.5 cursor-col-resize hover:bg-cyan-500/40 bg-slate-800/60 transition-colors shrink-0 flex items-center justify-center group"
      >
        <GripVertical size={12} className="text-slate-700 group-hover:text-cyan-500 transition-colors" />
      </div>

      {/* Panel Body */}
      <aside className="flex-1 border-l border-slate-800 bg-[#0B0F17]/95 flex flex-col z-10 select-none overflow-hidden">
        {renderPanelContent()}
      </aside>
    </div>
  );
};
