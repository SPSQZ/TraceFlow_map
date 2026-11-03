import re
import shutil
import zipfile
import io
import subprocess
from pathlib import Path
from typing import Tuple, Optional
import httpx
from ..config import WORKSPACE_DIR, SAMPLE_REPO_DIR

GITHUB_REGEX = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/(?P<owner>[\w.-]+)/(?P<repo>[\w.-]+)(?:/tree/(?P<branch>[\w.-]+))?/?$"
)

class GitHubService:
    @staticmethod
    def is_local_dir(path_str: str) -> Optional[Path]:
        """Checks if a string represents an existing local directory."""
        if not path_str:
            return None
        cleaned = path_str.strip().strip('"').strip("'")
        try:
            p = Path(cleaned).resolve()
            if p.exists() and p.is_dir():
                return p
        except Exception:
            pass
        return None

    @staticmethod
    def parse_url(url: str) -> Optional[Tuple[str, str, str]]:
        clean_url = url.strip()
        match = GITHUB_REGEX.match(clean_url)
        if not match:
            # Also allow format owner/repo
            parts = clean_url.strip("/").split("/")
            if len(parts) == 2 and not clean_url.startswith("http") and not ":" in clean_url:
                return parts[0], parts[1], "main"
            return None
        owner = match.group("owner")
        repo = match.group("repo")
        if repo.endswith(".git"):
            repo = repo[:-4]
        branch = match.group("branch") or "main"
        return owner, repo, branch

    @classmethod
    async def fetch_repository(
        cls,
        url: Optional[str],
        branch: str = "main",
        use_sample: bool = False,
        local_path: Optional[str] = None,
        analysis_id: str = "demo"
    ) -> Tuple[Path, str]:
        """
        Retrieves repository files and prepares them in a local workspace directory.
        Supports:
          1. Built-in sample repo (use_sample=True)
          2. Explicit local folder (local_path='...')
          3. Auto-detected local directory from input string
          4. GitHub URL (via fast 'git clone --depth 1' with zipball fallback)
        """
        dest_dir = WORKSPACE_DIR / f"repo_{analysis_id}"
        if dest_dir.exists():
            shutil.rmtree(dest_dir, ignore_errors=True)
        dest_dir.mkdir(parents=True, exist_ok=True)

        # 1. Built-in sample repo
        if use_sample:
            if SAMPLE_REPO_DIR.exists():
                shutil.copytree(SAMPLE_REPO_DIR, dest_dir, dirs_exist_ok=True)
                return dest_dir, "TraceFlow-Sample-Store"
            else:
                raise FileNotFoundError("Built-in sample repository directory not found.")

        # 2. Local folder path (explicit or auto-detected in url input)
        input_candidate = local_path or url or ""
        local_dir = cls.is_local_dir(input_candidate)
        if local_dir:
            shutil.copytree(local_dir, dest_dir, dirs_exist_ok=True)
            return dest_dir, f"Local: {local_dir.name}"

        if not url:
            raise ValueError("No GitHub repository URL or local folder path provided.")

        # 3. Parse GitHub URL
        parsed = cls.parse_url(url)
        if not parsed:
            raise ValueError(
                f"Could not parse '{url}'. Please enter a valid GitHub URL (e.g. 'https://github.com/facebook/react'), "
                f"'owner/repo', or a valid local directory path on your machine."
            )
        owner, repo, parsed_branch = parsed
        effective_branch = branch if branch != "main" else parsed_branch

        # 4. Attempt Git Clone first (Fast, no API rate limits)
        git_url = f"https://github.com/{owner}/{repo}.git"
        git_success = False

        try:
            cmd = ["git", "clone", "--depth", "1", "-b", effective_branch, git_url, str(dest_dir)]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
            if proc.returncode == 0:
                git_success = True
            elif effective_branch == "main":
                # Try fallback branch 'master'
                cmd_fallback = ["git", "clone", "--depth", "1", "-b", "master", git_url, str(dest_dir)]
                proc2 = subprocess.run(cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
                if proc2.returncode == 0:
                    git_success = True
        except Exception:
            git_success = False

        if git_success:
            # Remove .git folder inside sandbox to keep scanner fast
            git_folder = dest_dir / ".git"
            if git_folder.exists():
                shutil.rmtree(git_folder, ignore_errors=True)
            return dest_dir, f"{owner}/{repo}"

        # 5. Fallback: GitHub Zipball Download API
        zip_url = f"https://api.github.com/repos/{owner}/{repo}/zipball/{effective_branch}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "TraceFlow-Map-Engine/1.0",
        }

        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            resp = await client.get(zip_url, headers=headers)
            if resp.status_code == 404 and effective_branch == "main":
                fallback_url = f"https://api.github.com/repos/{owner}/{repo}/zipball/master"
                resp = await client.get(fallback_url, headers=headers)

            if resp.status_code == 403 and "rate limit" in resp.text.lower():
                raise RuntimeError(
                    "GitHub API rate limit exceeded for unauthenticated requests. "
                    "Please install git on your system or use local repository paths."
                )

            if resp.status_code != 200:
                raise RuntimeError(
                    f"Failed to retrieve repository from GitHub (HTTP {resp.status_code}): {resp.text[:200]}"
                )

            zip_bytes = io.BytesIO(resp.content)
            with zipfile.ZipFile(zip_bytes) as z:
                top_dirs = {name.split("/")[0] for name in z.namelist() if "/" in name}
                z.extractall(dest_dir)
                if len(top_dirs) == 1:
                    wrapper = dest_dir / list(top_dirs)[0]
                    if wrapper.is_dir():
                        for item in wrapper.iterdir():
                            shutil.move(str(item), str(dest_dir / item.name))
                        wrapper.rmdir()

        return dest_dir, f"{owner}/{repo}"
