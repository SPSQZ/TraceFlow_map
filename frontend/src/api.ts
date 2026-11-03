import {
  AnalysisStatus,
  Overview,
  GraphResponse,
  Issues,
  FileDetails,
  FlowTrace,
} from "./types";

const API_BASE = "/api";

export async function startAnalysis(
  url?: string,
  useSample = false,
  localPath?: string
): Promise<AnalysisStatus> {
  const res = await fetch(`${API_BASE}/repositories/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, use_sample: useSample, local_path: localPath }),
  });
  if (!res.ok) throw new Error("Failed to start analysis");
  return res.json();
}

export async function checkStatus(analysisId: string): Promise<AnalysisStatus> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/status`);
  if (!res.ok) throw new Error("Failed to check status");
  return res.json();
}

export async function fetchOverview(analysisId: string): Promise<Overview> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/overview`);
  if (!res.ok) throw new Error("Failed to fetch overview");
  return res.json();
}

export async function fetchGraph(
  analysisId: string,
  mode: "architecture" | "dependency" | "flow",
  flowIndex = 0
): Promise<GraphResponse> {
  const res = await fetch(
    `${API_BASE}/analysis/${analysisId}/graph?mode=${mode}&flow_index=${flowIndex}`
  );
  if (!res.ok) throw new Error("Failed to fetch graph data");
  return res.json();
}

export async function fetchFileContent(
  analysisId: string,
  filePath: string
): Promise<FileDetails> {
  const res = await fetch(
    `${API_BASE}/analysis/${analysisId}/file/${encodeURIComponent(filePath)}`
  );
  if (!res.ok) throw new Error("Failed to fetch file details");
  return res.json();
}

export async function fetchIssues(analysisId: string): Promise<Issues> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/issues`);
  if (!res.ok) throw new Error("Failed to fetch issues");
  return res.json();
}

export async function fetchFlows(
  analysisId: string
): Promise<{ flows: FlowTrace[] }> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/flows`);
  if (!res.ok) throw new Error("Failed to fetch flows");
  return res.json();
}

export async function askQuestion(
  analysisId: string,
  question: string,
  persona: "beginner" | "intermediate" | "developer",
  selectedNode?: string
) {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      persona,
      selected_node: selectedNode,
    }),
  });
  if (!res.ok) throw new Error("Failed to send question to AI");
  return res.json();
}

