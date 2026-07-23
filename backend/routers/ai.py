import os
import subprocess
import json
from pathlib import Path
from typing import Generator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


class TranscribeRequest(BaseModel):
    clip_path: str
    language: str | None = None


class SceneDetectRequest(BaseModel):
    clip_path: str
    threshold: float = 27.0


class RemoveSilenceRequest(BaseModel):
    clip_path: str
    threshold_db: float = -40.0
    min_duration: float = 0.5


class RemoveBackgroundRequest(BaseModel):
    clip_path: str
    output_path: str | None = None


@router.post("/transcribe")
def transcribe(req: TranscribeRequest):
    if not os.path.isfile(req.clip_path):
        raise HTTPException(status_code=400, detail="File not found")

    try:
        from core.ai_models import get_whisper_model
        model = get_whisper_model()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Whisper model not available: {e}")

    segments, _ = model.transcribe(
        req.clip_path,
        language=req.language,
        beam_size=5,
        vad_filter=True,
    )

    results = []
    for seg in segments:
        results.append({"start": seg.start, "end": seg.end, "text": seg.text.strip()})

    return {"segments": results}


@router.post("/scene-detect")
def scene_detect(req: SceneDetectRequest):
    if not os.path.isfile(req.clip_path):
        raise HTTPException(status_code=400, detail="File not found")

    try:
        from scenedetect import open_video, SceneManager
        from scenedetect.detectors import ContentDetector

        video = open_video(req.clip_path)
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=req.threshold))
        scene_manager.detect_scenes(video, show_progress=False)
        scene_list = scene_manager.get_scene_list()

        timestamps = [scene[0].get_seconds() for scene in scene_list]
        return {"timestamps": timestamps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove-silence")
def remove_silence(req: RemoveSilenceRequest):
    if not os.path.isfile(req.clip_path):
        raise HTTPException(status_code=400, detail="File not found")

    cmd = [
        "ffmpeg", "-i", req.clip_path,
        "-af", f"silencedetect=noise={req.threshold_db}dB:d={req.min_duration}",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stderr

    silences = []
    start = None
    for line in output.splitlines():
        if "silence_start" in line:
            try:
                start = float(line.split("silence_start:")[1].strip())
            except (IndexError, ValueError):
                pass
        elif "silence_end" in line and start is not None:
            try:
                end_part = line.split("silence_end:")[1].split("|")[0].strip()
                end = float(end_part)
                silences.append({"start": start, "end": end})
                start = None
            except (IndexError, ValueError):
                pass

    return {"silences": silences}


@router.post("/remove-background")
def remove_background(req: RemoveBackgroundRequest):
    if not os.path.isfile(req.clip_path):
        raise HTTPException(status_code=400, detail="File not found")

    try:
        from rembg import remove, new_session
    except ImportError:
        raise HTTPException(status_code=503, detail="rembg not installed")

    raise HTTPException(status_code=501, detail="Background removal not yet implemented for video")
