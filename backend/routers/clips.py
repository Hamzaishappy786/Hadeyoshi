import os
import uuid
import subprocess
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from core.ffmpeg_utils import generate_thumbnail, generate_waveform

router = APIRouter()

THUMB_DIR = Path(os.environ.get("TEMP", "/tmp")) / "vedit" / "thumbs"
WAVE_DIR = Path(os.environ.get("TEMP", "/tmp")) / "vedit" / "waveforms"
THUMB_DIR.mkdir(parents=True, exist_ok=True)
WAVE_DIR.mkdir(parents=True, exist_ok=True)

_media_store: dict[str, dict] = {}


class ImportRequest(BaseModel):
    paths: list[str]


def probe_file(path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_streams", "-show_format", path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise ValueError(f"ffprobe failed: {result.stderr}")
    data = json.loads(result.stdout)
    streams = data.get("streams", [])
    fmt = data.get("format", {})

    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)

    duration = float(fmt.get("duration", 0))
    width = int(video["width"]) if video else None
    height = int(video["height"]) if video else None
    fps = None
    if video and "r_frame_rate" in video:
        num, den = video["r_frame_rate"].split("/")
        fps = round(int(num) / int(den), 3) if int(den) else None

    media_type = "video" if video else ("audio" if audio else "image")
    ext = Path(path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}:
        media_type = "image"

    return {
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "has_audio": audio is not None,
        "type": media_type,
    }


@router.post("/import")
def import_clips(req: ImportRequest):
    results = []
    for path in req.paths:
        if not os.path.isfile(path):
            raise HTTPException(status_code=400, detail=f"File not found: {path}")

        # Check if already imported (deduplicate by path)
        existing = next((m for m in _media_store.values() if m["path"] == path), None)
        if existing:
            results.append(existing)
            continue

        try:
            info = probe_file(path)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        media_id = str(uuid.uuid4())
        name = Path(path).name

        thumb_url = None
        if info["type"] in ("video", "image"):
            thumb_path = THUMB_DIR / f"{media_id}.jpg"
            try:
                generate_thumbnail(path, str(thumb_path))
                thumb_url = f"/clips/{media_id}/thumbnail"
            except Exception as e:
                print(f"[Thumbnail] Failed for {path}: {e}")

        wave_url = None
        if info["has_audio"] or info["type"] == "audio":
            wave_path = WAVE_DIR / f"{media_id}.png"
            try:
                generate_waveform(path, str(wave_path))
                wave_url = f"/clips/{media_id}/waveform"
            except Exception as e:
                print(f"[Waveform] Failed for {path}: {e}")

        media = {
            "id": media_id,
            "name": name,
            "path": path,
            "type": info["type"],
            "duration": info["duration"],
            "width": info["width"],
            "height": info["height"],
            "fps": info["fps"],
            "thumbnailUrl": thumb_url,
            "waveformUrl": wave_url,
        }
        _media_store[media_id] = media
        results.append(media)

    return results


@router.get("/{media_id}/thumbnail")
def get_thumbnail(media_id: str):
    thumb_path = THUMB_DIR / f"{media_id}.jpg"
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(str(thumb_path), media_type="image/jpeg")


@router.get("/{media_id}/waveform")
def get_waveform(media_id: str):
    wave_path = WAVE_DIR / f"{media_id}.png"
    if not wave_path.exists():
        raise HTTPException(status_code=404, detail="Waveform not found")
    return FileResponse(str(wave_path), media_type="image/png")
