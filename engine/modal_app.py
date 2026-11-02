"""Nemi's engine on Modal: the same FastAPI app, with Manim, LaTeX, ffmpeg and
Remotion's headless Chrome in one image, and lessons on a persistent volume.

    modal secret create nemi-meta MODEL_API_KEY=...
    modal deploy engine/modal_app.py
"""

import threading
import time
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parent.parent
VIDEO = ROOT / "packages" / "video"
PUBLIC_URL = "https://nema1502--nemi-engine-web.us-east.modal.run"

CHROME_LIBS = [
    "libnss3", "libdbus-1-3", "libatk1.0-0", "libatk-bridge2.0-0", "libcups2", "libdrm2", "libxkbcommon0",
    "libxcomposite1", "libxdamage1", "libxfixes3", "libxrandr2", "libgbm1", "libasound2", "libxshmfence1",
]
LATEX = ["texlive-latex-base", "texlive-latex-extra", "texlive-fonts-recommended", "texlive-science", "cm-super", "dvisvgm"]

# The Manim style library asks for Segoe UI, which Linux doesn't have
FONT_ALIAS = (
    '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>'
    "<alias><family>Segoe UI</family><prefer><family>DejaVu Sans</family></prefer></alias></fontconfig>"
)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "curl", "ca-certificates", "build-essential", "pkg-config", "python3-dev",
                 "libcairo2-dev", "libpango1.0-dev", "fonts-dejavu-core", *LATEX, *CHROME_LIBS)
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
        f"printf '%s' '{FONT_ALIAS}' > /etc/fonts/local.conf && fc-cache -f",
    )
    .pip_install_from_requirements(str(ROOT / "engine" / "requirements.txt"))
    .add_local_file(VIDEO / "package.json", "/root/packages/video/package.json", copy=True)
    .run_commands("cd /root/packages/video && npm install --no-audit --no-fund && npx remotion browser ensure")
    .env({"NEMI_DATA": "/data", "NEMI_PUBLIC_URL": PUBLIC_URL})
    .add_local_dir(VIDEO, "/root/packages/video", ignore=["node_modules", "build", "out", "**/*.test.ts"])
    .add_local_dir(ROOT / "engine", "/root/engine",
                   ignore=[".venv", "data", "media", "tests", "**/__pycache__", "motor/auditoria", "motor/media"])
)

app = modal.App("nemi-engine")
data = modal.Volume.from_name("nemi-data", create_if_missing=True)


def _keep_committing() -> None:
    """Lessons are written by background jobs, so push volume changes every few seconds."""
    while True:
        time.sleep(5)
        try:
            data.commit()
        except Exception:
            pass


@app.function(
    image=image,
    volumes={"/data": data},
    secrets=[modal.Secret.from_name("nemi-meta")],
    cpu=4,
    memory=8192,
    timeout=3600,
    max_containers=1,  # one engine: jobs, locks and the render queue live in memory
    scaledown_window=1200,
)
@modal.concurrent(max_inputs=50)
@modal.asgi_app()
def web():
    import sys

    sys.path.insert(0, "/root/engine")
    threading.Thread(target=_keep_committing, daemon=True).start()
    from nemi.api import app as api

    return api
