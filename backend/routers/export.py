import asyncio
import json
import os
import subprocess
import uuid
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

_jobs: dict[str, dict] = {}


class ExportRequest(BaseModel):
    project: dict
    settings: dict


@router.post("/render")
async def start_render(req: ExportRequest):
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "queued", "progress": 0, "process": None}

    asyncio.create_task(_run_export(job_id, req.project, req.settings))

    return {"job_id": job_id}


async def _run_export(job_id: str, project: dict, settings: dict):
    from core.ffmpeg_utils import render_timeline
    try:
        _jobs[job_id]["status"] = "running"
        async for event in render_timeline(project, settings, job_id):
            _jobs[job_id].update(event)
        _jobs[job_id]["status"] = "done"
        _jobs[job_id]["progress"] = 100
    except Exception as e:
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)


@router.get("/progress/{job_id}")
async def export_progress(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        while True:
            job = _jobs.get(job_id, {})
            status = job.get("status", "unknown")
            data = json.dumps({
                "progress": job.get("progress", 0),
                "fps": job.get("fps", 0),
                "eta": job.get("eta", ""),
                "status": status,
            })
            yield {"data": data}
            if status in ("done", "error", "cancelled"):
                break
            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())


@router.post("/cancel/{job_id}")
def cancel_export(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    proc = job.get("process")
    if proc:
        proc.kill()
    job["status"] = "cancelled"
    return {"ok": True}
