from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class RepoAnalyzeRequest(BaseModel):
    url: Optional[str] = Field(None, description="GitHub repository URL")
    branch: Optional[str] = Field("main", description="Target branch")
    use_sample: bool = Field(False, description="Use built-in demo sample repository")
    local_path: Optional[str] = Field(None, description="Local folder path for offline testing")


class AnalysisStatus(BaseModel):
    id: str
    status: str  # pending, downloading, scanning, parsing, building_graph, completed, failed
    progress: int  # 0 to 100
    message: str
    repo_name: str
    commit_sha: Optional[str] = "HEAD"


class FileMeta(BaseModel):
    path: str
    language: str
    size: int
    lines: int
    layer: str  # client, gateway, service, data, util, other
    symbols_count: int = 0


class SymbolInfo(BaseModel):
    name: str
    kind: str  # function, class, route, variable
    file: str
    start_line: int
    end_line: int
    params: List[str] = []
    exported: bool = False
    calls: List[str] = []
    docstring: Optional[str] = None


class GraphNode(BaseModel):
    id: str
    type: str  # tierNode, fileNode, functionNode, endpointNode, databaseNode
    label: str
    tier: Optional[str] = None  # Client, Gateway, Service, Data, Utility
    file: Optional[str] = None
    data: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # CONTAINS, IMPORTS, CALLS, ROUTES_TO, READS_WRITES
    label: Optional[str] = None
    animated: bool = False
    line: Optional[int] = None


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    mode: str  # architecture, dependency, flow
    metrics: Dict[str, Any] = {}


class OverviewResponse(BaseModel):
    id: str
    repo_name: str
    stack: List[str]
    architecture_patterns: List[str]
    entry_points: List[str]
    total_files: int
    total_lines: int
    total_symbols: int
    languages: Dict[str, int]
    ai_summary: Dict[str, str]  # beginner, intermediate, developer summaries


class IssuesResponse(BaseModel):
    circular_dependencies: List[List[str]] = []
    god_files: List[Dict[str, Any]] = []
    orphans: List[str] = []
    central_hubs: List[Dict[str, Any]] = []


class AskRequest(BaseModel):
    question: str
    persona: str = "intermediate"  # beginner, intermediate, developer
    selected_node: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    persona: str
    referenced_files: List[str] = []
    referenced_symbols: List[str] = []
    suggested_nodes: List[str] = []


class TraceRequest(BaseModel):
    start_node: str
    end_node: str


class TraceResponse(BaseModel):
    path: List[str]
    nodes: List[GraphNode]
    edges: List[GraphEdge]

