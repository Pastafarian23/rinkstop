"""Load .env.local before other imports. Usage: import load_secrets (must be FIRST)."""
import os
from pathlib import Path


def _parse_dotenv(path):
    env = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        key, _, value = line.partition('=')
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        env[key] = value
    return env


def _load():
    for filename in ('.env.local', '.env', '.env.live'):
        p = Path.cwd() / filename
        if p.exists():
            for k, v in _parse_dotenv(p).items():
                os.environ.setdefault(k, v)
            return


_load()
