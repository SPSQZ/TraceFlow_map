export interface AnalysisStatus {
  id: string;
  status: "pending" | "downloading" | "scanning" | "parsing" | "building_graph" | "analyzing_graph" | "generating_ai" | "completed" | "failed";
  progress: number;
  message: string;
  repo_name: string;
}

export interface Overview {
  id: string;
  repo_name: string;
  stack: string[];
  architecture_patterns: string[];
  entry_points: string[];
  total_files: number;
  total_lines: number;
  total_symbols: number;
  languages: Record<string, number>;
  ai_summary: {
    beginner: string;
    intermediate: string;
    developer: string;
  };
}

export interface GraphNodeData {
  [key: string]: any;
  title?: string;
  subtitle?: string;
  file_count?: number;
  sample_files?: string[];
  tier_type?: string;
  path?: string;
  filename?: string;
  language?: string;
  layer?: string;
  lines?: number;
  is_cyclic?: boolean;
  size?: number;
  step?: number;
  name?: string;
  tier?: string;
  file?: string;
  description?: string;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  tier?: string;
  file?: string;
  data: GraphNodeData;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  animated?: boolean;
  line?: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mode: "architecture" | "dependency" | "flow";
  metrics: Record<string, any>;
}

export interface Issues {
  circular_dependencies: string[][];
  god_files: Array<{ file: string; lines: number; connections: number; reason: string }>;
  orphans: string[];
  central_hubs: Array<{ file: string; in_degree: number; pagerank: number }>;
}

export interface FileDetails {
  path: string;
  content: string;
  language: string;
  symbols: Array<{
    name: string;
    kind: string;
    start_line: number;
    end_line: number;
    params: string[];
  }>;
  incoming_deps: string[];
  outgoing_deps: string[];
  ai_explanation: {
    beginner?: string;
    intermediate?: string;
    developer?: string;
  };
}

export interface FlowTrace {
  id: string;
  title: string;
  entry_endpoint: string;
  method: string;
  steps: Array<{
    step: number;
    tier: string;
    name: string;
    file: string;
    description: string;
  }>;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  persona?: "beginner" | "intermediate" | "developer";
  referenced_files?: string[];
  referenced_symbols?: string[];
}
