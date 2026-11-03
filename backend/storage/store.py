from typing import Dict, Any, Optional
import time

class AnalysisStore:
    def __init__(self):
        self._analyses: Dict[str, Dict[str, Any]] = {}

    def create(self, analysis_id: str, repo_name: str) -> Dict[str, Any]:
        data = {
            "id": analysis_id,
            "repo_name": repo_name,
            "status": "pending",
            "progress": 0,
            "message": "Initializing analysis...",
            "created_at": time.time(),
            "root_path": None,
            "files": [],
            "files_dict": {},
            "file_contents": {},
            "symbols": [],
            "imports": [],
            "calls": [],
            "routes": [],
            "stack": [],
            "patterns": [],
            "entry_points": [],
            "graphs": {
                "architecture": None,
                "dependency": None,
                "flow": None,
            },
            "issues": {
                "circular_dependencies": [],
                "god_files": [],
                "orphans": [],
                "central_hubs": [],
            },
            "summaries": {
                "beginner": "",
                "intermediate": "",
                "developer": "",
            },
        }
        self._analyses[analysis_id] = data
        return data

    def get(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        return self._analyses.get(analysis_id)

    def update_status(self, analysis_id: str, status: str, progress: int, message: str):
        record = self.get(analysis_id)
        if record:
            record["status"] = status
            record["progress"] = progress
            record["message"] = message

    def list_all(self):
        return [
            {
                "id": k,
                "repo_name": v["repo_name"],
                "status": v["status"],
                "progress": v["progress"],
            }
            for k, v in self._analyses.items()
        ]

# Global singleton store
store = AnalysisStore()

