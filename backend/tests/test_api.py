import sys
import asyncio
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app

@pytest.mark.anyio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

@pytest.mark.anyio
async def test_sample_analysis_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Trigger analyze on sample repo
        res = await ac.post("/api/repositories/analyze", json={"use_sample": True})
        assert res.status_code == 200
        data = res.json()
        analysis_id = data["id"]
        assert data["status"] in ["pending", "downloading", "scanning", "completed"]

        # Wait a moment for background pipeline to complete
        for _ in range(15):
            await asyncio.sleep(0.5)
            s_res = await ac.get(f"/api/analysis/{analysis_id}/status")
            if s_res.json()["status"] == "completed":
                break

        # 2. Check overview
        ov_res = await ac.get(f"/api/analysis/{analysis_id}/overview")
        assert ov_res.status_code == 200
        overview = ov_res.json()
        assert overview["total_files"] > 0
        assert len(overview["stack"]) > 0

        # 3. Check Mode 1, Mode 2, Mode 3 graphs
        m1 = await ac.get(f"/api/analysis/{analysis_id}/graph?mode=architecture")
        assert m1.status_code == 200
        assert len(m1.json()["nodes"]) > 0

        m2 = await ac.get(f"/api/analysis/{analysis_id}/graph?mode=dependency")
        assert m2.status_code == 200
        assert len(m2.json()["nodes"]) == overview["total_files"]

        m3 = await ac.get(f"/api/analysis/{analysis_id}/graph?mode=flow")
        assert m3.status_code == 200

        # 4. Check Issues (Cycles detected)
        iss = await ac.get(f"/api/analysis/{analysis_id}/issues")
        assert iss.status_code == 200
        assert len(iss.json()["circular_dependencies"]) > 0

        # 5. Check Ask AI
        ask_res = await ac.post(
            f"/api/analysis/{analysis_id}/ask",
            json={"question": "How does authentication work?", "persona": "beginner"}
        )
        assert ask_res.status_code == 200
        assert len(ask_res.json()["answer"]) > 0

