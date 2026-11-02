import os
from pathlib import Path

from dotenv import load_dotenv

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
load_dotenv(ROOT / ".env")

MODEL_API_KEY = os.environ.get("MODEL_API_KEY", "")
META_BASE_URL = os.environ.get("META_BASE_URL", "https://api.meta.ai/v1")

# Which Meta model does which job. Spark 1.3 is the default brain; the planner
# can be switched to Muse Wonder for long, dense documents.
PLANNER_MODEL = os.environ.get("NEMI_PLANNER_MODEL", "muse-spark-1.3")
CODER_MODEL = os.environ.get("NEMI_CODER_MODEL", "muse-spark-1.3")
VISION_MODEL = os.environ.get("NEMI_VISION_MODEL", "muse-spark-1.3")
IMAGE_MODEL = "muse-image-1.0"
SAM_MODEL = "sam-3.1"
ASR_MODEL = "muse-voice-transcribe-1.0"

DATA = Path(os.environ.get("NEMI_DATA", ENGINE / "data"))
LESSONS = DATA / "lessons"
LESSONS.mkdir(parents=True, exist_ok=True)

MOTOR = ENGINE / "motor"
VIDEO_PKG = ROOT / "packages" / "video"
PYTHON = os.environ.get("NEMI_PYTHON") or str(Path(os.sys.executable))

# Where the renderer (Remotion, running on this machine) fetches assets from
PUBLIC_URL = os.environ.get("NEMI_PUBLIC_URL", "http://localhost:8000")
CORS_ORIGINS = os.environ.get("NEMI_CORS_ORIGINS", "http://localhost:3000").split(",")
