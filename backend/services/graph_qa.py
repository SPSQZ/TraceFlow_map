import json
import hashlib
import httpx
from typing import Dict, Any, List, Optional, Tuple
from ..config import AI_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL, GEMINI_API_KEY
from ..models.schemas import AskResponse, FileMeta, SymbolInfo


# ─────────────────────────────────────────────────────────────────────────────
# Intent Keywords → deterministic heuristic answer templates
# Each entry: (keywords, topic_label, beginner_fn, intermediate_fn, developer_fn)
# ─────────────────────────────────────────────────────────────────────────────
def _build_heuristic_answer(
    question: str,
    persona: str,
    ref_files: List[str],
    ref_symbols: List[str],
    routes: List[Dict],
    files_meta: List[FileMeta],
    resolved_imports: List[Dict],
) -> str:
    """
    Deterministic but QUESTION-SPECIFIC grounded heuristic answers.
    Every question gets a unique, context-aware response based on the
    actual file graph, symbols, routes, and detected architectural patterns.
    """
    q = question.lower()
    primary_file = ref_files[0] if ref_files else "unknown"
    primary_sym = ref_symbols[0] if ref_symbols else None

    # Count per-layer statistics for context richness
    layer_counts: Dict[str, int] = {}
    for fm in files_meta:
        layer_counts[fm.layer] = layer_counts.get(fm.layer, 0) + 1

    # Route list for auth/checkout/order-related questions
    route_paths = [r.get("path", "") for r in routes]
    auth_routes = [r for r in route_paths if any(k in r for k in ["auth", "login", "token", "register", "user", "account"])]
    order_routes = [r for r in route_paths if any(k in r for k in ["order", "cart", "checkout", "purchase", "pay"])]
    all_layer_names = sorted(set(fm.layer for fm in files_meta))

    # Caller-callee map for selected file
    file_callers = [imp["from_file"] for imp in resolved_imports if imp.get("target_file") == primary_file]
    file_callees = [imp["target_file"] for imp in resolved_imports if imp.get("from_file") == primary_file]

    sym_display = f"`{primary_sym}()`" if primary_sym else "core functions"
    file_display = f"`{primary_file}`" if primary_file != "unknown" else "this module"

    # ── 1. Auth / Login / Token / Session ───────────────────────────────────
    if any(k in q for k in ["auth", "login", "token", "password", "session", "sign in", "jwt"]):
        auth_route_str = ", ".join(auth_routes[:4]) if auth_routes else "(detected via service layer)"
        callers_str = ", ".join(f"`{f}`" for f in file_callers[:3]) if file_callers else "gateway routes"
        if persona == "beginner":
            return (
                f"Authentication works like a club bouncer! When you try to log in, "
                f"your request first hits the gateway (like the front door). "
                f"The gateway checks your username and password, creates a special wristband "
                f"(a JWT token), and hands it back to you. Next time you visit any protected "
                f"page, you show that wristband and get in without having to re-enter your password. "
                f"The relevant files in this codebase are: {', '.join(f'`{f}`' for f in ref_files[:3]) or file_display}."
            )
        elif persona == "developer":
            return (
                f"Auth flow in `{primary_file}`: "
                f"Routes detected: {auth_route_str or 'none explicitly in routes'}. "
                f"Entry symbol: {sym_display}. "
                f"Callers: {callers_str}. "
                f"Callees: {', '.join(f'`{f}`' for f in file_callees[:3]) or 'None (leaf)'}. "
                f"Pattern: credential validation → token issuance (JWT/session) → stateless authorization guard on protected routes."
            )
        else:
            return (
                f"Authentication is handled through {file_display} "
                f"({', '.join(ref_symbols[:3]) or 'token/session helpers'}). "
                f"The flow: client POST to `{auth_routes[0] if auth_routes else '/auth/login'}` → "
                f"credential validation in the gateway/service tier → JWT or session token issued → "
                f"subsequent requests verified via auth middleware. "
                f"Callers include {callers_str}."
            )

    # ── 2. Circular / Cyclic Dependencies ───────────────────────────────────
    elif any(k in q for k in ["circular", "cyclic", "cycle", "dependency loop", "circular dep"]):
        # Find actual cycles from resolved_imports
        cycle_pairs = []
        file_set = set(imp["from_file"] for imp in resolved_imports) | set(imp.get("target_file", "") for imp in resolved_imports)
        import_map: Dict[str, set] = {}
        for imp in resolved_imports:
            frm = imp.get("from_file", "")
            tgt = imp.get("target_file", "")
            if frm and tgt:
                import_map.setdefault(frm, set()).add(tgt)
        for a, targets in import_map.items():
            for b in targets:
                if b in import_map and a in import_map.get(b, set()):
                    cycle_pairs.append((a, b))

        cycle_count = len(cycle_pairs)
        cycle_example = f"`{cycle_pairs[0][0]}` ↔ `{cycle_pairs[0][1]}`" if cycle_pairs else "None detected"

        if persona == "beginner":
            return (
                f"A circular dependency is like two people each waiting for the other to move first — "
                f"a deadlock! In this codebase, {'there are ' + str(cycle_count) + ' such mutual dependency pairs' if cycle_count else 'no circular loops were found'}. "
                f"Example: {cycle_example}. "
                f"These can cause import errors and make the code hard to test independently. "
                f"They're highlighted in red on the graph — look for the 🔴 Cycle badge."
            )
        elif persona == "developer":
            cycles_str = "; ".join(f"`{a}` → `{b}` → `{a}`" for a, b in cycle_pairs[:5]) or "None"
            return (
                f"Static cycle analysis: {cycle_count} bidirectional import cycles detected. "
                f"Cycles: {cycles_str}. "
                f"Each cycle creates a potential import-time deadlock and prevents clean unit isolation. "
                f"Recommend extracting shared interfaces to a separate `shared/` or `contracts/` module."
            )
        else:
            cycles_str = ", ".join(f"`{a}` ↔ `{b}`" for a, b in cycle_pairs[:3]) or "None found"
            return (
                f"This codebase has {cycle_count} circular dependency pair(s): {cycles_str}. "
                f"Each creates a tight coupling where module A imports B and B imports A. "
                f"This complicates testing and refactoring. "
                f"On the graph these are shown with a red CYCLE badge and animated edges."
            )

    # ── 3. Order / Checkout / Cart Flow ─────────────────────────────────────
    elif any(k in q for k in ["order", "checkout", "cart", "purchase", "payment", "buy"]):
        order_route_str = ", ".join(order_routes[:4]) if order_routes else "(found via service layer)"
        callers_str = ", ".join(f"`{f}`" for f in file_callers[:3]) if file_callers else "client layer"
        if persona == "beginner":
            return (
                f"The order/checkout flow works like ordering at a restaurant. "
                f"You (the client) tell the waiter (gateway) what you want → "
                f"the waiter passes it to the kitchen (service layer: {file_display}) → "
                f"the kitchen writes the order in the ledger (database/data layer). "
                f"Key routes in this project: {order_route_str or 'found in service files'}."
            )
        elif persona == "developer":
            return (
                f"Checkout/Order execution trace: routes `{order_route_str or 'unknown'}` → "
                f"controller/gateway (validates payload, auth guard) → "
                f"service function {sym_display} in {file_display} → "
                f"data persistence layer (models: {', '.join(f'`{f}`' for f in file_callees[:3]) or 'data layer'}). "
                f"Callers upstream: {callers_str}."
            )
        else:
            return (
                f"The checkout/order flow in this project: "
                f"Client sends a request to `{order_routes[0] if order_routes else 'order endpoint'}` → "
                f"gateway validates and authorizes → {sym_display} in {file_display} processes business logic → "
                f"order state is persisted via the data tier. "
                f"Referenced modules: {', '.join(f'`{f}`' for f in ref_files[:4])}."
            )

    # ── 4. Architecture / Structure / Overview ──────────────────────────────
    elif any(k in q for k in ["architecture", "structure", "overview", "how does", "explain", "what is", "describe"]):
        layer_summary = ", ".join(f"{k}: {v} files" for k, v in sorted(layer_counts.items()) if k != "other")
        entry_files = [fm.path for fm in files_meta if fm.layer in ("gateway", "client") and fm.lines > 20][:3]
        if persona == "beginner":
            return (
                f"This project is organized like a building with floors! "
                f"Ground floor: the client/UI layer where users interact. "
                f"Middle floor: the gateway and service layer where business logic lives. "
                f"Top floor: the data layer where everything gets stored. "
                f"Layer breakdown: {layer_summary or 'multiple layers'}. "
                f"Doors in: {', '.join(entry_files) or 'main entry files'}."
            )
        elif persona == "developer":
            return (
                f"Codebase topology: {layer_summary}. "
                f"Entry symbols: {sym_display}. "
                f"Primary entrypoints: {', '.join(entry_files) or file_display}. "
                f"Layers detected: {', '.join(all_layer_names)}. "
                f"Total imports resolved: {len(resolved_imports)}. "
                f"Use Dependency Mode (Mode 2) for the full LR DAG and Flow Mode (Mode 3) for execution traces."
            )
        else:
            return (
                f"This codebase follows a layered architecture: {layer_summary}. "
                f"Client requests enter via {', '.join(entry_files[:2]) or 'gateway files'}, "
                f"pass through controller/gateway boundaries, are processed by service modules, "
                f"and persisted via data-layer models. "
                f"Switch to Mode 2 (Dependency) to trace exact file-to-file import chains."
            )

    # ── 5. Selected File / Node Specific Question ────────────────────────────
    elif primary_file != "unknown" and len(question.split()) <= 5:
        file_layer = next((fm.layer for fm in files_meta if fm.path == primary_file), "service")
        file_lines = next((fm.lines for fm in files_meta if fm.path == primary_file), 0)
        callers_str = ", ".join(f"`{f}`" for f in file_callers[:3]) if file_callers else "no callers (root/leaf)"
        callees_str = ", ".join(f"`{f}`" for f in file_callees[:3]) if file_callees else "no dependencies (leaf)"
        if persona == "beginner":
            return (
                f"`{primary_file.split('/')[-1]}` is a helper module in the {file_layer} department. "
                f"It's about {file_lines} lines long and talks to: {callees_str}. "
                f"Other parts that use it: {callers_str}."
            )
        elif persona == "developer":
            sym_list = ", ".join(f"`{s}()`" for s in ref_symbols[:5]) or "no exported symbols matched"
            return (
                f"Module: `{primary_file}` | Tier: {file_layer} | LOC: {file_lines} | "
                f"Symbols: {sym_list} | "
                f"Imports: {callees_str} | "
                f"Imported by: {callers_str}."
            )
        else:
            return (
                f"`{primary_file}` operates in the {file_layer} tier ({file_lines} LOC). "
                f"It exposes {sym_display} and depends on {callees_str}. "
                f"It is referenced by {callers_str}."
            )

    # ── 6. Generic / Unknown Question (still unique per question hash) ───────
    else:
        # Create a question-specific fingerprint to vary the answer wording
        q_hash = int(hashlib.md5(question.lower().strip().encode()).hexdigest(), 16)
        intro_options = [
            f"Looking at `{primary_file}`, this involves",
            f"Based on the dependency graph for `{primary_file}`, the answer relates to",
            f"The static code analysis for `{primary_file}` shows that",
            f"Tracing through `{primary_file}` in the graph reveals that",
        ]
        intro = intro_options[q_hash % len(intro_options)]

        callers_str = ", ".join(f"`{f}`" for f in file_callers[:3]) if file_callers else "no upstream callers"
        callees_str = ", ".join(f"`{f}`" for f in file_callees[:3]) if file_callees else "no downstream dependencies"

        if persona == "beginner":
            return (
                f"Good question! {intro} a component that handles part of the application's work. "
                f"It connects to: {callees_str}. "
                f"Try clicking on the highlighted nodes in the graph to explore the connections visually, "
                f"or switch to Mode 2 (Dependency) to see the full import chain."
            )
        elif persona == "developer":
            sym_list = ", ".join(f"`{s}()`" for s in ref_symbols[:4]) or "no direct symbol matches"
            return (
                f"{intro} symbols [{sym_list}]. "
                f"Direct deps: {callees_str}. Referenced by: {callers_str}. "
                f"For exact implementation, open the Code Viewer tab and inspect `{primary_file}`. "
                f"Set GEMINI_API_KEY in `.env` for full AI-powered analysis."
            )
        else:
            return (
                f"{intro} functionality orchestrated by {sym_display}. "
                f"The module depends on {callees_str} and is consumed by {callers_str}. "
                f"Enable the Gemini API key in `.env` for deeper, fully AI-grounded answers tailored to this exact question."
            )


class GraphQA:
    @staticmethod
    async def answer_question(
        question: str,
        persona: str,
        selected_node: Optional[str],
        analysis_data: Dict[str, Any]
    ) -> AskResponse:
        """
        Graph-grounded Code RAG answering engine.
        Gathers context from topological graph neighbors and AST symbols,
        then routes to Gemini (if key set) or a fully question-specific heuristic.
        """
        files: List[FileMeta] = analysis_data.get("files", [])
        symbols: List[SymbolInfo] = analysis_data.get("symbols", [])
        routes = analysis_data.get("routes", [])
        file_contents = analysis_data.get("file_contents", {})
        resolved_imports: List[Dict] = analysis_data.get("resolved_imports", [])

        q_lower = question.lower()

        # 1. Find matching symbols (name contains a question keyword ≥4 chars)
        matched_symbols: List[SymbolInfo] = []
        q_words = [w for w in q_lower.split() if len(w) >= 4]
        for s in symbols:
            sn = s.name.lower()
            if any(w in sn or sn in q_lower for w in q_words):
                matched_symbols.append(s)

        # 2. Prioritize selected node
        ref_files: List[str] = []
        ref_symbols: List[str] = []
        code_context_snippets: List[str] = []

        if selected_node and selected_node in file_contents:
            ref_files.append(selected_node)
            snippet = file_contents[selected_node][:600]
            code_context_snippets.append(f"--- File: {selected_node} ---\n{snippet}")

        for s in matched_symbols[:3]:
            if s.file not in ref_files:
                ref_files.append(s.file)
            ref_symbols.append(s.name)
            if s.file in file_contents:
                lines = file_contents[s.file].splitlines()
                start = max(0, s.start_line - 1)
                end = min(len(lines), s.end_line + 5)
                snip = "\n".join(lines[start:end])
                code_context_snippets.append(
                    f"--- Symbol {s.name} ({s.file}:{s.start_line}-{s.end_line}) ---\n{snip}"
                )

        # Fallback: pick first gateway/service files
        if not ref_files:
            for fm in files:
                if fm.layer in ("gateway", "service") and fm.lines > 10:
                    ref_files.append(fm.path)
                    if len(ref_files) >= 2:
                        break

        context_str = "\n\n".join(code_context_snippets[:3])

        # 3. Query LLM (Ollama or Gemini) if enabled
        prompt = f"""
You are TraceFlow Map's AI Architecture Assistant. Answer this question based on the verified static code graph:
User Question: "{question}"
Target Audience: {persona.upper()} (Beginner: plain analogies; Intermediate: architectural patterns; Developer: exact calls/lines).

Verified Code Context:
{context_str}

Referenced Files: {', '.join(ref_files)}
Referenced Symbols: {', '.join(ref_symbols)}

Instructions:
- Ground your answer ONLY in the provided code context.
- Explicitly cite files and function names.
- Match the requested explanation level ({persona}).
- Keep the response clear, concise, and informative.
"""

        # 3a. Try Local Ollama (e.g. qwen2.5-coder:7b)
        if AI_PROVIDER in ("auto", "ollama"):
            try:
                ollama_url = f"{OLLAMA_BASE_URL}/api/generate"
                payload = {
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.2}
                }
                async with httpx.AsyncClient(timeout=25.0) as client:
                    res = await client.post(ollama_url, json=payload)
                    if res.status_code == 200:
                        ans_text = res.json().get("response", "").strip()
                        if ans_text:
                            return AskResponse(
                                answer=ans_text,
                                persona=persona,
                                referenced_files=ref_files,
                                referenced_symbols=ref_symbols,
                                suggested_nodes=ref_files[:3]
                            )
            except Exception:
                pass

        # 3b. Try Gemini if configured & Ollama not used or unavailable
        if AI_PROVIDER in ("auto", "gemini") and GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {"contents": [{"parts": [{"text": prompt}]}]}

            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        ans_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if ans_text:
                            return AskResponse(
                                answer=ans_text,
                                persona=persona,
                                referenced_files=ref_files,
                                referenced_symbols=ref_symbols,
                                suggested_nodes=ref_files[:3]
                            )
            except Exception:
                pass

        # 4. Deterministic but question-specific heuristic fallback
        ans = _build_heuristic_answer(
            question=question,
            persona=persona,
            ref_files=ref_files,
            ref_symbols=ref_symbols,
            routes=routes,
            files_meta=files,
            resolved_imports=resolved_imports,
        )

        return AskResponse(
            answer=ans,
            persona=persona,
            referenced_files=ref_files,
            referenced_symbols=ref_symbols,
            suggested_nodes=ref_files[:3]
        )

