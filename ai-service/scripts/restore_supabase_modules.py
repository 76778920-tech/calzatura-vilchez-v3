from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
src = subprocess.check_output(
    ["git", "show", "HEAD:ai-service/services/supabase_client.py"],
    cwd=ROOT.parent,
    text=True,
)
lines = src.splitlines(keepends=True)

http = "".join(lines[0:54])
ire = "".join(lines[104:177])
campaigns = "".join(lines[178:])

(ROOT / "services/supabase/http.py").write_text(
    '"""Supabase HTTP primitives."""\n\n' + http, encoding="utf-8"
)
(ROOT / "services/supabase/ire_model.py").write_text(
    '"""IRE and model state persistence."""\n\n'
    "import logging\nfrom datetime import datetime, timezone\n\nimport requests\n\n"
    "from services.supabase.http import _get_headers, _cutoff_iso, _query\n\n"
    + ire,
    encoding="utf-8",
)
(ROOT / "services/supabase/campaigns.py").write_text(
    '"""Campaign event persistence."""\n\n'
    "import logging\nfrom datetime import datetime, timezone\n\nimport requests\n\n"
    "from services.supabase.http import _get_headers, _query\n\n"
    + campaigns,
    encoding="utf-8",
)
print("supabase modules restored")
