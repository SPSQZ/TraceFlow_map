import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from .config import PORT, HOST
from .models.schemas import (
    RepoAnalyzeRequest, AnalysisStatus, OverviewResponse, GraphResponse,
    IssuesResponse, AskRequest, AskResponse, TraceRequest, TraceResponse
)
from .storage.store import store
from .services import (
    GitHubService, RepoScanner, StackDetector, ParserEngine,
    ImportResolver, CallGraphEngine, DataflowEngine, GraphEngine,
    GraphAnalyzer, AIExplainer, GraphQA
)

app = FastAPI(
    title="TraceFlow Map API",
    description="Codebase-to-Architecture Visualizer & Code Intelligence Engine",
    version="1.0.0"
)

# Enable CORS for local Vite / frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def run_analysis_pipeline(analysis_id: str, req: RepoAnalyzeRequest):
    """
    Complete Background Execution Pipeline:
    Ingestion -> Intelligence -> AST Parsing -> Resolution -> Graphs -> Analytics -> AI
    """
    try:
        # Step 1: Ingestion
        store.update_status(analysis_id, "downloading", 15, "Retrieving repository snapshot...")
        repo_dir, repo_name = await GitHubService.fetch_repository(
            url=req.url,
            branch=req.branch or "main",
            use_sample=req.use_sample,
            local_path=req.local_path,
            analysis_id=analysis_id
        )

        analysis = store.get(analysis_id)
        analysis["root_path"] = str(repo_dir)
        analysis["repo_name"] = repo_name

        # Step 2: Scanner & Intelligence
        store.update_status(analysis_id, "scanning", 30, "Scanning files and identifying technology stack...")
        files_meta, file_contents = RepoScanner.scan(repo_dir)
        stack, patterns, entry_points = StackDetector.detect(files_meta, file_contents)

        analysis["files"] = files_meta
        analysis["files_dict"] = {f.path: f for f in files_meta}
        analysis["file_contents"] = file_contents
        analysis["stack"] = stack
        analysis["patterns"] = patterns
        analysis["entry_points"] = entry_points

        # Step 3: AST Parsing & Symbol Extraction
        store.update_status(analysis_id, "parsing", 50, "Parsing Abstract Syntax Trees and extracting symbols...")
        all_symbols = []
        all_imports = []
        all_calls = {}
        all_routes = []

        for f in files_meta:
            content = file_contents.get(f.path, "")
            syms, imps, calls, rts = [], [], [], []
            if f.language == "python":
                syms, imps, calls, rts = ParserEngine.parse_python(f.path, content)
            elif f.language in ["typescript", "javascript"]:
                syms, imps, calls, rts = ParserEngine.parse_javascript_typescript(f.path, content)

            f.symbols_count = len(syms)
            all_symbols.extend(syms)
            for imp in imps:
                all_imports.append({**imp, "from_file": f.path})
            all_calls[f.path] = calls
            for r in rts:
                all_routes.append({**r, "file": f.path})

        analysis["symbols"] = all_symbols
        analysis["calls"] = all_calls
        analysis["routes"] = all_routes

        # Step 4: Import Resolution & Call Graph
        store.update_status(analysis_id, "building_graph", 65, "Resolving cross-file dependencies and call graphs...")
        resolved_imports = []
        for imp in all_imports:
            target = ImportResolver.resolve(imp["source"], imp["from_file"], analysis["files_dict"])
            if target:
                resolved_imports.append({
                    "from_file": imp["from_file"],
                    "target_file": target,
                    "symbol": imp.get("imported_symbol", ""),
                    "line": imp.get("line")
                })
        analysis["resolved_imports"] = resolved_imports

        call_edges = CallGraphEngine.build_call_graph(
            {f.path: [s for s in all_symbols if s.file == f.path] for f in files_meta},
            resolved_imports,
            all_calls
        )
        analysis["call_edges"] = call_edges

        # Step 5: Dataflow Execution Traces
        flow_traces = DataflowEngine.extract_flows(
            all_routes,
            call_edges,
            {tier: [f.path for f in files_meta if f.layer == tier] for tier in ["client", "gateway", "service", "data"]}
        )
        analysis["flow_traces"] = flow_traces

        # Step 6: Graph Analytics (Cycles, Centrality, God Files)
        store.update_status(analysis_id, "analyzing_graph", 80, "Detecting architectural cycles and dependency metrics...")
        analytics = GraphAnalyzer.analyze(files_meta, resolved_imports)
        analysis["issues"] = analytics

        # Step 7: Build the 3 Graph Views
        arch_graph = GraphEngine.build_architecture_view(files_meta, resolved_imports)
        dep_graph = GraphEngine.build_dependency_view(files_meta, resolved_imports, analytics["circular_dependencies"])
        flow_graph = GraphEngine.build_flow_view(flow_traces, 0)

        analysis["graphs"]["architecture"] = arch_graph
        analysis["graphs"]["dependency"] = dep_graph
        analysis["graphs"]["flow"] = flow_graph

        # Step 8: AI Explanations
        store.update_status(analysis_id, "generating_ai", 90, "Synthesizing multi-level architectural explanations...")
        summaries = await AIExplainer.explain_repository(
            repo_name=repo_name,
            stack=stack,
            patterns=patterns,
            entry_points=entry_points,
            files=files_meta
        )
        analysis["summaries"] = summaries

        store.update_status(analysis_id, "completed", 100, "Architecture visualization ready!")
    except Exception as e:
        store.update_status(analysis_id, "failed", 0, f"Analysis error: {str(e)}")


@app.post("/api/repositories/analyze", response_model=AnalysisStatus)
async def analyze_repository(req: RepoAnalyzeRequest, bg_tasks: BackgroundTasks):
    """
    Submits a GitHub repo URL or sample flag to initiate architectural analysis.
    """
    analysis_id = str(uuid.uuid4())[:8]
    repo_label = req.url or ("TraceFlow-Sample" if req.use_sample else "Local-Repo")
    store.create(analysis_id, repo_label)
    
    bg_tasks.add_task(run_analysis_pipeline, analysis_id, req)
    
    return AnalysisStatus(
        id=analysis_id,
        status="pending",
        progress=5,
        message="Job queued for processing...",
        repo_name=repo_label
    )


@app.get("/api/analysis/{analysis_id}/status", response_model=AnalysisStatus)
async def get_analysis_status(analysis_id: str):
    record = store.get(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis ID not found")
    return AnalysisStatus(
        id=record["id"],
        status=record["status"],
        progress=record["progress"],
        message=record["message"],
        repo_name=record["repo_name"]
    )


@app.get("/api/analysis/{analysis_id}/overview", response_model=OverviewResponse)
async def get_analysis_overview(analysis_id: str):
    record = store.get(analysis_id)
    if not record or record["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not ready or not found")

    files = record["files"]
    total_lines = sum(f.lines for f in files)
    languages = {}
    for f in files:
        languages[f.language] = languages.get(f.language, 0) + 1

    return OverviewResponse(
        id=analysis_id,
        repo_name=record["repo_name"],
        stack=record["stack"],
        architecture_patterns=record["patterns"],
        entry_points=record["entry_points"],
        total_files=len(files),
        total_lines=total_lines,
        total_symbols=len(record["symbols"]),
        languages=languages,
        ai_summary=record["summaries"]
    )


@app.get("/api/analysis/{analysis_id}/graph", response_model=GraphResponse)
async def get_graph(
    analysis_id: str,
    mode: str = Query("architecture", pattern="^(architecture|dependency|flow)$"),
    flow_index: int = 0
):
    record = store.get(analysis_id)
    if not record or record["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")

    if mode == "flow":
        return GraphEngine.build_flow_view(record.get("flow_traces", []), flow_index)
    
    graph = record["graphs"].get(mode)
    if not graph:
        raise HTTPException(status_code=404, detail="Requested graph mode not found")
    return graph


@app.get("/api/analysis/{analysis_id}/files")
async def get_files(analysis_id: str):
    record = store.get(analysis_id)
    if not record or record["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")
    return {"files": record["files"]}


@app.get("/api/analysis/{analysis_id}/file/{file_path:path}")
async def get_file_content(analysis_id: str, file_path: str):
    record = store.get(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")

    content = record["file_contents"].get(file_path)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File not found in analysis: {file_path}")

    fmeta = record["files_dict"].get(file_path)
    file_symbols = [s for s in record["symbols"] if s.file == file_path]
    incoming_deps = [imp["from_file"] for imp in record.get("resolved_imports", []) if imp["target_file"] == file_path]
    outgoing_deps = [imp["target_file"] for imp in record.get("resolved_imports", []) if imp["from_file"] == file_path]

    ai_desc = AIExplainer.explain_file(fmeta, file_symbols, incoming_deps, outgoing_deps) if fmeta else {}

    return {
        "path": file_path,
        "content": content,
        "language": fmeta.language if fmeta else "text",
        "symbols": file_symbols,
        "incoming_deps": list(set(incoming_deps)),
        "outgoing_deps": list(set(outgoing_deps)),
        "ai_explanation": ai_desc
    }


@app.get("/api/analysis/{analysis_id}/issues", response_model=IssuesResponse)
async def get_issues(analysis_id: str):
    record = store.get(analysis_id)
    if not record or record["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")

    issues = record.get("issues", {})
    return IssuesResponse(
        circular_dependencies=issues.get("circular_dependencies", []),
        god_files=issues.get("god_files", []),
        orphans=issues.get("orphans", []),
        central_hubs=issues.get("central_hubs", [])
    )


@app.get("/api/analysis/{analysis_id}/flows")
async def get_flow_traces(analysis_id: str):
    record = store.get(analysis_id)
    if not record or record["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")
    return {"flows": record.get("flow_traces", [])}


@app.post("/api/analysis/{analysis_id}/trace", response_model=TraceResponse)
async def trace_path(analysis_id: str, req: TraceRequest):
    record = store.get(analysis_id)
    if not record or record["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")

    path = GraphAnalyzer.find_path(record.get("resolved_imports", []), req.start_node, req.end_node)
    
    # Extract sub-nodes and sub-edges
    nodes = []
    edges = []
    for i, p in enumerate(path):
        f = record["files_dict"].get(p)
        if f:
            nodes.append(
                GraphEngine.build_dependency_view([f], []).nodes[0]
            )
        if i > 0:
            edges.append({
                "id": f"trace_{path[i-1]}_{p}",
                "source": path[i-1],
                "target": p,
                "type": "TRACED_FLOW",
                "animated": True
            })

    return TraceResponse(path=path, nodes=nodes, edges=edges)


@app.post("/api/analysis/{analysis_id}/ask", response_model=AskResponse)
async def ask_codebase(analysis_id: str, req: AskRequest):
    record = store.get(analysis_id)
    if not record or record["status"] != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")

    return await GraphQA.answer_question(
        question=req.question,
        persona=req.persona,
        selected_node=req.selected_node,
        analysis_data=record
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "TraceFlow Map", "version": "1.0.0"}


# Serve frontend static assets if built
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
