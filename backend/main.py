import shutil
import subprocess
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import clips, timeline, effects, ai, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check FFmpeg is available
    if not shutil.which("ffmpeg"):
        print(
            "\n[ERROR] FFmpeg not found in PATH.\n"
            "Please install FFmpeg: https://ffmpeg.org/download.html\n"
            "Then add it to your system PATH and restart the app.\n"
        )
    else:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
        print(f"[FFmpeg] {result.stdout.splitlines()[0]}")

    # Whisper loads on first use (model download may take time)

    yield


app = FastAPI(title="Video Editor API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clips.router, prefix="/clips", tags=["clips"])
app.include_router(timeline.router, prefix="/timeline", tags=["timeline"])
app.include_router(effects.router, prefix="/effects", tags=["effects"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(export.router, prefix="/export", tags=["export"])


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/files")
async def serve_file(path: str):
    """Serve a local file by absolute path (for preview player)."""
    from fastapi.responses import FileResponse
    import os
    if not os.path.isfile(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
