import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { LeftSidebar } from "./components/LeftSidebar";
import { GraphCanvas } from "./components/GraphCanvas";
import { RightInspector } from "./components/RightInspector";
import { ExportModal } from "./components/ExportModal";
import {
  startAnalysis,
  checkStatus,
  fetchOverview,
  fetchGraph,
  fetchFileContent,
  fetchIssues,
  fetchFlows,
} from "./api";
import {
  AnalysisStatus,
  Overview,
  GraphResponse,
  Issues,
  FileDetails,
  FlowTrace,
} from "./types";

export function App() {
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [issues, setIssues] = useState<Issues | null>(null);
  const [flows, setFlows] = useState<FlowTrace[]>([]);
  const [selectedFlowIndex, setSelectedFlowIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<"architecture" | "dependency" | "flow">("architecture");
  const [files, setFiles] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"inspect" | "code" | "chat">("inspect");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);

  // Poll analysis status until completed
  const pollAnalysis = async (id: string) => {
    setIsLoading(true);
    const interval = setInterval(async () => {
      try {
        const s = await checkStatus(id);
        setStatus(s);
        if (s.status === "completed") {
          clearInterval(interval);
          setAnalysisId(id);
          await loadAnalysisResults(id, currentMode, selectedFlowIndex);
          setIsLoading(false);
        } else if (s.status === "failed") {
          clearInterval(interval);
          setIsLoading(false);
          alert(`Analysis failed: ${s.message}`);
        }
      } catch (err) {
        clearInterval(interval);
        setIsLoading(false);
      }
    }, 800);
  };

  const loadAnalysisResults = async (
    id: string,
    mode: "architecture" | "dependency" | "flow",
    flowIdx = 0
  ) => {
    try {
      const [ov, gr, iss, fls, flList] = await Promise.all([
        fetchOverview(id),
        fetchGraph(id, mode, flowIdx),
        fetchIssues(id),
        fetchFlows(id),
        fetch(`/api/analysis/${id}/files`).then(r => r.json()),
      ]);
      setOverview(ov);
      setGraphData(gr);
      setIssues(iss);
      setFlows(fls.flows || []);
      setFiles(flList.files || []);
      
      // Auto-select first entry point file if available
      if (ov.entry_points.length > 0) {
        handleSelectNode(ov.entry_points[0], id);
      }
    } catch (err) {
      console.error("Error loading analysis results:", err);
    }
  };

  // Launch analysis with custom GitHub URL or local folder
  const handleAnalyze = async (target: string, isLocal = false) => {
    try {
      setIsLoading(true);
      const res = isLocal
        ? await startAnalysis(undefined, false, target)
        : await startAnalysis(target, false, undefined);
      setBackendOffline(false);
      pollAnalysis(res.id);
    } catch (err: any) {
      setIsLoading(false);
      setBackendOffline(true);
      console.error("Error starting analysis:", err);
    }
  };

  // Launch analysis with pre-built demo sample
  const handleLoadSample = async () => {
    try {
      setIsLoading(true);
      const res = await startAnalysis(undefined, true);
      setBackendOffline(false);
      pollAnalysis(res.id);
    } catch (err: any) {
      setIsLoading(false);
      setBackendOffline(true);
      console.error("Error loading sample:", err);
    }
  };

  // Switch between Mode 1, Mode 2, and Mode 3
  const handleModeChange = async (mode: "architecture" | "dependency" | "flow") => {
    setCurrentMode(mode);
    if (analysisId) {
      setIsLoading(true);
      try {
        const gr = await fetchGraph(analysisId, mode, selectedFlowIndex);
        setGraphData(gr);
        setBackendOffline(false);
      } catch (err: any) {
        console.error("Failed to fetch mode graph:", err);
        setBackendOffline(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      handleLoadSample();
    }
  };

  // Select flow index in Mode 3
  const handleSelectFlowIndex = async (index: number) => {
    setSelectedFlowIndex(index);
    if (analysisId) {
      setIsLoading(true);
      try {
        const gr = await fetchGraph(analysisId, "flow", index);
        setGraphData(gr);
        setBackendOffline(false);
      } catch (err: any) {
        console.error("Failed to fetch flow graph:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Select node to inspect
  const handleSelectNode = async (nodeId: string, customAnalysisId?: string) => {
    setSelectedNodeId(nodeId);
    const targetId = customAnalysisId || analysisId;
    if (!targetId) return;

    // In dependency mode, nodeId is a file path
    try {
      const details = await fetchFileContent(targetId, nodeId);
      setFileDetails(details);
    } catch (err) {
      // If node is a tier or step rather than a direct file, clear file details
      setFileDetails(null);
    }
  };

  // On first mount: automatically trigger Demo Sample analysis for immediate live demo!
  useEffect(() => {
    handleLoadSample();
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0F17] overflow-hidden">
      {/* Top Header */}
      <Header
        currentMode={currentMode}
        onModeChange={handleModeChange}
        onAnalyze={handleAnalyze}
        onLoadSample={handleLoadSample}
        isLoading={isLoading}
        flows={flows}
        selectedFlowIndex={selectedFlowIndex}
        onSelectFlowIndex={handleSelectFlowIndex}
        onExport={() => setIsExportOpen(true)}
      />

      {/* Backend Offline Warning Banner */}
      {backendOffline && (
        <div className="w-full bg-rose-500/15 border-b border-rose-500/40 px-4 py-2 flex items-center justify-between text-xs text-rose-300 z-30">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>
              <strong>Backend Disconnected:</strong> FastAPI server is not detected on port 8005. Please run{" "}
              <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white font-mono border border-slate-700">
                python run.py
              </code>{" "}
              in your terminal.
            </span>
          </div>
          <button
            onClick={handleLoadSample}
            className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[11px] transition-all shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Progress Bar when analyzing */}
      {status && status.status !== "completed" && status.status !== "failed" && (
        <div className="w-full h-1 bg-slate-900 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}

      {/* Main 3-Column Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          overview={overview}
          issues={issues}
          files={files}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
        />

        {/* Center Canvas */}
        <GraphCanvas
          graphData={graphData}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          isLoading={isLoading}
        />

        {/* Right Inspector Drawer */}
        <RightInspector
          analysisId={analysisId}
          selectedNodeId={selectedNodeId}
          fileDetails={fileDetails}
          onSelectNode={handleSelectNode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        graphData={graphData}
        repoName={overview?.repo_name || "Repository"}
      />
    </div>
  );
}
