import React, { useState, useEffect } from "react";
import {
  FileText,
  Code,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Layers,
  Send,
  User,
  Bot,
  CornerDownRight,
  ChevronRight,
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
    } catch (err: any) {
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

  return (
    <aside className="w-96 border-l border-slate-800 bg-[#0B0F17]/95 flex flex-col h-[calc(100vh-4rem)] z-10 select-none">
      {/* Tab Navigation */}
      <div className="h-11 border-b border-slate-800 flex items-center px-3 bg-slate-900/60">
        <button
          onClick={() => onTabChange("inspect")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === "inspect"
              ? "bg-slate-800 text-cyan-400 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText size={13} />
          <span>Inspector</span>
        </button>

        <button
          onClick={() => onTabChange("code")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === "code"
              ? "bg-slate-800 text-cyan-400 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Code size={13} />
          <span>Code Viewer</span>
        </button>

        <button
          onClick={() => onTabChange("chat")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center space-x-1.5 transition-all ${
            activeTab === "chat"
              ? "bg-slate-800 text-cyan-400 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare size={13} />
          <span>Ask AI</span>
        </button>
      </div>

      {/* Tab 1: Node Inspector */}
      {activeTab === "inspect" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {fileDetails ? (
            <>
              {/* File Header */}
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
                        persona === p
                          ? "bg-purple-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Persona-based explanation */}
                <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                  {fileDetails.ai_explanation[persona] ||
                    fileDetails.ai_explanation.intermediate ||
                    "Analyzing file architecture..."}
                </p>
              </div>

              {/* Contained Symbols */}
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
                          <span className="text-[10px] text-slate-400 capitalize">
                            {sym.kind}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          L{sym.start_line}-{sym.end_line}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Dependencies */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                  <Layers size={13} className="text-blue-400" />
                  <span>Module Connections</span>
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Depends On ({fileDetails.outgoing_deps.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {fileDetails.outgoing_deps.map((dep, i) => (
                        <button
                          key={i}
                          onClick={() => onSelectNode(dep)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 truncate max-w-[200px]"
                        >
                          {dep.split("/").pop()}
                        </button>
                      ))}
                      {fileDetails.outgoing_deps.length === 0 && (
                        <span className="text-[10px] text-slate-500 italic">None (Root leaf)</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Referenced By ({fileDetails.incoming_deps.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {fileDetails.incoming_deps.map((dep, i) => (
                        <button
                          key={i}
                          onClick={() => onSelectNode(dep)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/60 truncate max-w-[200px]"
                        >
                          {dep.split("/").pop()}
                        </button>
                      ))}
                      {fileDetails.incoming_deps.length === 0 && (
                        <span className="text-[10px] text-slate-500 italic">No incoming calls</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <FileText size={32} className="mb-2 text-slate-600" />
              <p className="text-xs">Click on any node in the graph to inspect its architecture and dependencies.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Code Viewer */}
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
                  <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-3">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 whitespace-pre overflow-x-auto">
                    {line || " "}
                  </span>
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

      {/* Tab 3: Ask Codebase Chat */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col h-[calc(100vh-6.75rem)]">
          {/* Persona selector in chat */}
          <div className="p-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
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

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1 ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] p-2.5 rounded-xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-cyan-500 text-slate-950 font-medium rounded-br-none"
                      : "bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Referenced Files Citations */}
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
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/30 flex flex-wrap gap-1">
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

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60">
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
    </aside>
  );
};

