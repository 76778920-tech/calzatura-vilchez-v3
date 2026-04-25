from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys

SERVICE_DIR = Path(__file__).resolve().parent / "ai-service"
SERVICE_MAIN = SERVICE_DIR / "main.py"

if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))

spec = spec_from_file_location("ai_service_main", SERVICE_MAIN)
if spec is None or spec.loader is None:
    raise RuntimeError(f"No se pudo cargar el servicio IA desde {SERVICE_MAIN}")

module = module_from_spec(spec)
spec.loader.exec_module(module)

app = module.app
