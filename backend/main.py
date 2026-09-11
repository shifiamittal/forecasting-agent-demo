"""
FastAPI backend — Forecasting Agent
Sessions 1+2: health, ingest, retrieve, run-cycle endpoints
Session 4: fixture endpoints — /api/clients, /api/fixture/{client_id}, /api/run/{client_id}
"""

import json
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

FIXTURES_DIR = Path(__file__).parent / "fixtures"

_CLIENT_DISPLAY_NAMES = {
    "velora": "Velora Foods",
    "nuvora":  "Nuvora Materials",
    "terralune": "Terralune Tires",
}

def _find_fixture_path(client_id: str) -> Path | None:
    """Return the fixture file for client_id (case-insensitive), or None."""
    prefix = client_id.lower()
    for path in FIXTURES_DIR.glob(f"{prefix}_*.json"):
        return path
    return None

app = FastAPI(title="Forecasting Agent API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


@app.post("/api/ingest")
def ingest():
    try:
        from knowledge.ingest import main as run_ingest
        run_ingest()
        return {"status": "ingestion complete"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.post("/api/retrieve")
def retrieve(payload: dict):
    """
    Body: { "query": "...", "client_id": "VELORA", "user_role": "DS" }
    """
    try:
        from knowledge.retrieval import get_rag_context
        result = get_rag_context(
            query=payload.get("query", ""),
            client_id=payload.get("client_id", "VELORA"),
            user_role=payload.get("user_role", "DS"),
        )
        return result
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.post("/api/run-cycle")
def run_cycle(payload: dict):
    """
    Run full agent chain for a scenario.
    Body: { "scenario_id": "velora_cycle_18", "user_role": "DS" }
    Returns complete results (non-streaming).
    """
    try:
        from agents.orchestrator import run_full_cycle, DEMO_SCENARIOS
        scenario_id = payload.get("scenario_id", "velora_cycle_18")
        user_role   = payload.get("user_role", "DS")
        scenario    = DEMO_SCENARIOS.get(scenario_id)
        if not scenario:
            return {"status": "error",
                    "detail": f"Unknown scenario: {scenario_id}. "
                              f"Available: {list(DEMO_SCENARIOS.keys())}"}
        results = run_full_cycle(scenario, user_role=user_role)
        return {"status": "complete", "results": results}
    except Exception as e:
        import traceback
        return {"status": "error", "detail": str(e),
                "trace": traceback.format_exc()}


@app.get("/api/scenarios")
def list_scenarios():
    from agents.orchestrator import DEMO_SCENARIOS
    return {"scenarios": list(DEMO_SCENARIOS.keys())}


# ── Fixture endpoints ─────────────────────────────────────────────────────────

@app.get("/api/clients")
def list_clients():
    """Return all clients inferred from files in the fixtures directory."""
    clients = []
    for path in sorted(FIXTURES_DIR.glob("*.json")):
        parts = path.stem.split("_", 1)
        if len(parts) != 2:
            continue
        client_lower, cycle_id = parts
        clients.append({
            "id":    client_lower.upper(),
            "name":  _CLIENT_DISPLAY_NAMES.get(client_lower, client_lower.title()),
            "cycle": cycle_id,
        })
    return clients


@app.get("/api/fixture/{client_id}")
def get_fixture(client_id: str):
    """Return the fixture JSON for the given client_id."""
    path = _find_fixture_path(client_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"No fixture found for client: {client_id}")
    return json.loads(path.read_text(encoding="utf-8"))


_CLIENT_SCENARIO_MAP = {
    "VELORA": "velora_cycle_18",
    "NUVORA":  "nuvora_cycle_18",
    "TERRALUNE": "terralune_cycle_18",
}


def _load_fixture(client_id: str) -> dict:
    path = _find_fixture_path(client_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"No fixture found for client: {client_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def _run_frontend_pipeline(scenario_id: str) -> dict:
    import os
    from dotenv import load_dotenv

    load_dotenv()
    required = ("ANTHROPIC_API_KEY", "QDRANT_URL", "QDRANT_API_KEY")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise ValueError(f"Missing configuration: {', '.join(missing)}")

    from agents.orchestrator import DEMO_SCENARIOS, run_full_cycle
    from pipeline_adapter import adapt_pipeline_output

    scenario = DEMO_SCENARIOS[scenario_id]
    return adapt_pipeline_output(run_full_cycle(scenario, "DS"), scenario)


@app.get("/api/run-stream/{client_id}")
async def run_pipeline_stream(client_id: str):
    """Streams pipeline progress as Server-Sent Events."""
    import threading

    client_upper = client_id.upper()
    scenario_id  = _CLIENT_SCENARIO_MAP.get(client_upper)
    if not scenario_id:
        raise HTTPException(status_code=404, detail=f"No scenario for {client_id}")

    AGENTS = [
        ("trigger_router",   "Trigger Router",       "Scanning forecast cycle and routing agents..."),
        ("exception_triage", "Exception Triage",     "Scoring SKU exceptions by severity..."),
        ("rca_diagnostic",   "RCA Diagnostic",       "Investigating root cause layer by layer..."),
        ("retrain_override", "Retrain / Override",   "Evaluating retrain vs override decision..."),
        ("eval_agent",       "Eval Agent",           "Scoring diagnosis quality..."),
    ]

    async def event_stream():
        def _send(event_type, data):
            return f"data: {json.dumps({'type': event_type, **data})}\n\n"

        yield _send("start", {"message": "Pipeline started", "total_agents": len(AGENTS)})

        result_container = {}
        error_container  = {}

        def _run():
            try:
                result_container["result"] = _run_frontend_pipeline(scenario_id)
            except Exception as exc:
                error_container["error"] = str(exc)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

        for i, (key, name, message) in enumerate(AGENTS):
            yield _send("agent_start", {
                "agent": key, "agent_name": name,
                "message": message, "step": i + 1,
            })
            # Poll every 2 s; move on after 15 s per agent regardless
            waited = 0
            while thread.is_alive() and waited < 15:
                await asyncio.sleep(2)
                waited += 2

            if not thread.is_alive():
                # Pipeline finished early — flash remaining agents as instant
                yield _send("agent_complete", {"agent": key, "agent_name": name, "step": i + 1})
                for j in range(i + 1, len(AGENTS)):
                    yield _send("agent_start",    {"agent": AGENTS[j][0], "agent_name": AGENTS[j][1], "message": AGENTS[j][2], "step": j + 1})
                    yield _send("agent_complete", {"agent": AGENTS[j][0], "agent_name": AGENTS[j][1], "step": j + 1})
                break
            else:
                yield _send("agent_complete", {"agent": key, "agent_name": name, "step": i + 1})

        thread.join(timeout=120)

        if "result" in result_container:
            yield _send("complete", {"data": result_container["result"]})
        else:
            msg = error_container.get("error", "Pipeline timed out")
            yield _send("error", {"message": msg})
            data = _load_fixture(client_upper)
            data["source"]   = "fixture"
            data["run_note"] = f"Pipeline failed: {msg[:100]}. Returning fixture."
            yield _send("complete", {"data": data})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/run/{client_id}")
async def run_live_pipeline(client_id: str):
    """
    Run the real agent pipeline for a client and return frontend-shaped output.
    Falls back to fixture if the pipeline fails.
    """
    client_upper = client_id.upper()
    scenario_id  = _CLIENT_SCENARIO_MAP.get(client_upper)

    if not scenario_id:
        raise HTTPException(status_code=404, detail=f"No scenario configured for client: {client_id}")

    try:
        return await asyncio.to_thread(_run_frontend_pipeline, scenario_id)
    except Exception as e:
        import traceback
        print(f"[run_live_pipeline] Pipeline failed for {client_id}:\n{traceback.format_exc()}")
        data = _load_fixture(client_upper)
        data["source"]   = "fixture"
        data["run_note"] = f"Live pipeline failed: {str(e)[:120]}. Returning fixture."
        return data
