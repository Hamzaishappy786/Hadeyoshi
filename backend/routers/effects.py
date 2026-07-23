import base64
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

LUTS_DIR = Path(__file__).parent.parent.parent / "assets" / "luts"


class PreviewFrameRequest(BaseModel):
    clip_path: str
    timecode: float = 1.0
    brightness: float = 0
    contrast: float = 0
    saturation: float = 1
    hue: float = 0
    blur: float = 0
    sharpen: float = 0
    lut_path: str | None = None
    text_overlays: list[dict] | None = None


@router.post("/preview-frame")
def preview_frame(req: PreviewFrameRequest):
    if not os.path.isfile(req.clip_path):
        raise HTTPException(status_code=400, detail="File not found")

    filters = []

    # Color grade
    brightness_norm = req.brightness / 100.0
    contrast_norm = (req.contrast + 100) / 100.0
    saturation_norm = max(0, (req.saturation + 100) / 100.0)
    hue_deg = req.hue

    filters.append(
        f"eq=brightness={brightness_norm:.3f}:contrast={contrast_norm:.3f}:saturation={saturation_norm:.3f}"
    )
    if hue_deg != 0:
        filters.append(f"hue=h={hue_deg:.1f}")

    if req.blur > 0:
        sigma = req.blur
        filters.append(f"gblur=sigma={sigma:.1f}")

    if req.sharpen > 0:
        filters.append(f"unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount={req.sharpen:.1f}")

    if req.lut_path and os.path.isfile(req.lut_path):
        filters.append(f"lut3d='{req.lut_path}'")

    if req.text_overlays:
        for overlay in req.text_overlays:
            text = overlay.get("text", "").replace("'", "\\'").replace(":", "\\:")
            x = overlay.get("x", 50)
            y = overlay.get("y", 50)
            size = overlay.get("fontSize", 36)
            color = overlay.get("color", "#ffffff").lstrip("#")
            filters.append(
                f"drawtext=text='{text}':x=(w*{x/100:.3f}):y=(h*{y/100:.3f})"
                f":fontsize={size}:fontcolor=0x{color}"
            )

    filter_str = ",".join(filters) if filters else "null"

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(req.timecode),
            "-i", req.clip_path,
            "-vf", filter_str,
            "-vframes", "1",
            "-q:v", "3",
            tmp_path,
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=15)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="FFmpeg frame extraction failed")

        with open(tmp_path, "rb") as f:
            data = base64.b64encode(f.read()).decode()

        return {"frame": f"data:image/jpeg;base64,{data}"}
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.get("/luts")
def list_luts():
    LUTS_DIR.mkdir(parents=True, exist_ok=True)
    luts = [f.name for f in LUTS_DIR.glob("*.cube")]
    return {"luts": luts}
