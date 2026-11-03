import sys
from pathlib import Path

# Ensure TraceFlow_map is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pytest
from backend.services.repo_scanner import RepoScanner
from backend.services.stack_detector import StackDetector
from backend.services.parser_engine import ParserEngine
from backend.services.import_resolver import ImportResolver
from backend.services.call_graph_engine import CallGraphEngine
from backend.services.graph_engine import GraphEngine
from backend.services.graph_analyzer import GraphAnalyzer
from backend.services.dataflow_engine import DataflowEngine
from backend.services.ai_explainer import AIExplainer
from backend.config import SAMPLE_REPO_DIR

def test_repo_scanner_sample():
    assert SAMPLE_REPO_DIR.exists()
    files_meta, file_contents = RepoScanner.scan(SAMPLE_REPO_DIR)
    assert len(files_meta) > 0
    paths = [f.path for f in files_meta]
    assert any("authController" in p for p in paths)
    assert any("userModel" in p for p in paths)

def test_stack_detection():
    files_meta, file_contents = RepoScanner.scan(SAMPLE_REPO_DIR)
    stack, patterns, entries = StackDetector.detect(files_meta, file_contents)
    assert "Express" in stack or "Node.js" in stack
    assert len(patterns) > 0

def test_parser_and_imports():
    files_meta, file_contents = RepoScanner.scan(SAMPLE_REPO_DIR)
    auth_ctrl_path = [f.path for f in files_meta if "authController" in f.path][0]
    content = file_contents[auth_ctrl_path]
    
    symbols, imports, calls, routes = ParserEngine.parse_javascript_typescript(auth_ctrl_path, content)
    assert len(symbols) >= 2  # loginUser, registerUser
    assert any(s.name == "loginUser" for s in symbols)
    assert len(imports) >= 1

def test_circular_dependency_detection():
    files_meta, file_contents = RepoScanner.scan(SAMPLE_REPO_DIR)
    files_dict = {f.path: f for f in files_meta}

    all_imports = []
    for f in files_meta:
        content = file_contents[f.path]
        if f.language == "typescript":
            _, imps, _, _ = ParserEngine.parse_javascript_typescript(f.path, content)
            for imp in imps:
                target = ImportResolver.resolve(imp["source"], f.path, files_dict)
                if target:
                    all_imports.append({
                        "from_file": f.path,
                        "target_file": target,
                        "symbol": imp.get("imported_symbol")
                    })

    analytics = GraphAnalyzer.analyze(files_meta, all_imports)
    # Check that circular dependency is detected between authService and tokenService
    cycles = analytics["circular_dependencies"]
    assert len(cycles) > 0
    flat_cycle = [item for sub in cycles for item in sub]
    assert any("authService" in item for item in flat_cycle)
    assert any("tokenService" in item for item in flat_cycle)

def test_mode_views():
    files_meta, file_contents = RepoScanner.scan(SAMPLE_REPO_DIR)
    arch_graph = GraphEngine.build_architecture_view(files_meta, [])
    assert arch_graph.mode == "architecture"
    assert len(arch_graph.nodes) >= 3

    dep_graph = GraphEngine.build_dependency_view(files_meta, [])
    assert dep_graph.mode == "dependency"
    assert len(dep_graph.nodes) == len(files_meta)

def test_ai_explainer_personas():
    summaries = AIExplainer.generate_heuristic_summary(
        "TraceFlow-Sample", ["Express", "React", "PostgreSQL"], ["Client-Server"], ["server/index.ts"], 10
    )
    assert "beginner" in summaries
    assert "intermediate" in summaries
    assert "developer" in summaries
    assert "kitchen" in summaries["beginner"].lower() or "restaurant" in summaries["beginner"].lower()
