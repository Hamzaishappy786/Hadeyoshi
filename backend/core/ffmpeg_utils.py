import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import AsyncGenerator


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)


def generate_thumbnail(input_path: str, output_path: str, timestamp: float = 1.0):
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", input_path,
        "-vframes", "1",
        "-vf", "scale=320:-1",
        "-q:v", "5",
        output_path,
    ]
    r = _run(cmd)
    if r.returncode != 0:
        raise RuntimeError(f"Thumbnail failed: {r.stderr[-500:]}")


def generate_waveform(input_path: str, output_path: str, width: int = 800, height: int = 80):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter_complex",
        f"[0:a]showwavespic=s={width}x{height}:colors=white[v]",
        "-map", "[v]",
        "-frames:v", "1",
        output_path,
    ]
    r = _run(cmd)
    if r.returncode != 0:
        raise RuntimeError(f"Waveform failed: {r.stderr[-500:]}")


def trim_clip(input_path: str, output_path: str, start: float, duration: float):
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", input_path,
        "-t", str(duration),
        "-c", "copy",
        output_path,
    ]
    _run(cmd)


def concat_clips(clip_paths: list[str], output_path: str):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        for p in clip_paths:
            f.write(f"file '{p}'\n")
        list_file = f.name
    try:
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", list_file,
            "-c", "copy",
            output_path,
        ]
        _run(cmd)
    finally:
        os.unlink(list_file)


def change_speed(input_path: str, output_path: str, speed: float):
    pts = 1.0 / speed
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter_complex",
        f"[0:v]setpts={pts:.4f}*PTS[v];[0:a]atempo={speed:.2f}[a]",
        "-map", "[v]", "-map", "[a]",
        output_path,
    ]
    _run(cmd)


def reverse_clip(input_path: str, output_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", "reverse",
        "-af", "areverse",
        output_path,
    ]
    _run(cmd)


def add_text_overlay(input_path: str, output_path: str, text_overlays: list):
    filters = []
    for ov in text_overlays:
        text = ov.get("text", "").replace("'", "\\'").replace(":", "\\:")
        x = ov.get("x", 50)
        y = ov.get("y", 50)
        size = ov.get("fontSize", 36)
        color = ov.get("color", "#ffffff").lstrip("#")
        filters.append(
            f"drawtext=text='{text}':x=(w*{x/100:.3f}):y=(h*{y/100:.3f})"
            f":fontsize={size}:fontcolor=0x{color}"
        )
    vf = ",".join(filters)
    cmd = ["ffmpeg", "-y", "-i", input_path, "-vf", vf, output_path]
    _run(cmd)


def burn_subtitles(input_path: str, srt_path: str, output_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"subtitles='{srt_path}'",
        output_path,
    ]
    _run(cmd)


def apply_color_grade(input_path: str, output_path: str,
                      brightness: float, contrast: float,
                      saturation: float, hue: float):
    b = brightness / 100.0
    c = (contrast + 100) / 100.0
    s = max(0, (saturation + 100) / 100.0)
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"eq=brightness={b:.3f}:contrast={c:.3f}:saturation={s:.3f},hue=h={hue:.1f}",
        output_path,
    ]
    _run(cmd)


def apply_lut(input_path: str, lut_path: str, output_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"lut3d='{lut_path}'",
        output_path,
    ]
    _run(cmd)


def extract_audio(input_path: str, output_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vn", "-acodec", "pcm_s16le",
        output_path,
    ]
    _run(cmd)


def mix_audio_tracks(track_paths_with_volumes: list[tuple[str, float]], output_path: str):
    inputs = []
    for path, _ in track_paths_with_volumes:
        inputs += ["-i", path]

    filter_parts = []
    for i, (_, vol) in enumerate(track_paths_with_volumes):
        filter_parts.append(f"[{i}:a]volume={vol:.2f}[a{i}]")

    mix_inputs = "".join(f"[a{i}]" for i in range(len(track_paths_with_volumes)))
    filter_parts.append(f"{mix_inputs}amix=inputs={len(track_paths_with_volumes)}:normalize=0[aout]")

    cmd = inputs + [
        "-filter_complex", ";".join(filter_parts),
        "-map", "[aout]",
        "-y", output_path,
    ]
    _run(["ffmpeg"] + cmd)


RESOLUTION_MAP = {
    "480p": (854, 480),
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "4k": (3840, 2160),
    "source": None,
}


async def render_timeline(project: dict, settings: dict, job_id: str) -> AsyncGenerator[dict, None]:
    """
    Renders a full project to a video file.
    Streams progress events as dicts.
    """
    from routers.export import _jobs

    output_path = settings.get("outputPath", "output.mp4")
    fmt = settings.get("format", "mp4")
    resolution = settings.get("resolution", "1080p")
    fps = settings.get("fps", 30)
    crf = settings.get("crf", 23)

    tracks = project.get("tracks", [])
    video_tracks = [t for t in tracks if t["type"] == "video"]
    audio_tracks = [t for t in tracks if t["type"] == "audio"]

    if not video_tracks and not audio_tracks:
        raise ValueError("No tracks to render")

    # Build filter_complex
    input_args = []
    input_index = 0
    clip_input_map = {}  # clip_id -> input index

    all_clips = []
    for track in tracks:
        for clip in track.get("clips", []):
            all_clips.append((clip, track))

    # For simplicity in Phase 30: render first video track, first audio track
    # Phase 31 will add the full filter_complex
    video_clips = []
    for track in video_tracks:
        video_clips.extend(track.get("clips", []))

    audio_clips = []
    for track in audio_tracks:
        audio_clips.extend(track.get("clips", []))

    if not video_clips and not audio_clips:
        raise ValueError("No clips to render")

    # Build inputs
    clip_args = []
    for i, clip in enumerate(video_clips):
        media = next(
            (m for m in project.get("mediaFiles", []) if m["id"] == clip["mediaId"]), None
        )
        if not media:
            continue
        trim_start = clip.get("trimStart", 0)
        duration = clip.get("duration", media.get("duration", 10))
        clip_args.append({
            "path": media["path"],
            "trim_start": trim_start,
            "duration": duration,
            "clip": clip,
        })

    # Simple approach: trim each clip, concat
    tmpdir = tempfile.mkdtemp(prefix="vedit_render_")
    trimmed_paths = []

    total_clips = len(clip_args) or 1

    for i, ca in enumerate(clip_args):
        trimmed = os.path.join(tmpdir, f"clip_{i}.mp4")
        effects = ca["clip"].get("effects", {})

        vf_parts = []
        b = effects.get("brightness", 0) / 100.0
        c = (effects.get("contrast", 0) + 100) / 100.0
        s = max(0, (effects.get("saturation", 0) + 100) / 100.0)
        h = effects.get("hue", 0)
        vf_parts.append(f"eq=brightness={b:.3f}:contrast={c:.3f}:saturation={s:.3f}")
        if h != 0:
            vf_parts.append(f"hue=h={h:.1f}")

        res = RESOLUTION_MAP.get(resolution)
        if res:
            vf_parts.append(f"scale={res[0]}:{res[1]}:force_original_aspect_ratio=decrease,pad={res[0]}:{res[1]}:(ow-iw)/2:(oh-ih)/2")

        speed = ca["clip"].get("speed", 1.0)
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(ca["trim_start"]),
            "-i", ca["path"],
            "-t", str(ca["duration"] / speed),
            "-vf", ",".join(vf_parts),
            "-r", str(fps),
            "-an",
            trimmed,
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _jobs[job_id]["process"] = proc
        proc.wait()
        trimmed_paths.append(trimmed)

        progress = int(((i + 1) / total_clips) * 70)
        yield {"progress": progress}

    # Concat
    if len(trimmed_paths) > 1:
        list_file = os.path.join(tmpdir, "concat.txt")
        with open(list_file, "w") as f:
            for p in trimmed_paths:
                f.write(f"file '{p}'\n")
        concat_out = os.path.join(tmpdir, "concat.mp4")
        proc = subprocess.Popen([
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", list_file,
            "-c", "copy",
            concat_out,
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _jobs[job_id]["process"] = proc
        proc.wait()
        video_source = concat_out
    elif trimmed_paths:
        video_source = trimmed_paths[0]
    else:
        video_source = None

    yield {"progress": 80}

    # Final encode with audio
    final_cmd = ["ffmpeg", "-y"]
    if video_source:
        final_cmd += ["-i", video_source]

    for ca in audio_clips:
        media = next(
            (m for m in project.get("mediaFiles", []) if m["id"] == ca["mediaId"]), None
        )
        if media:
            final_cmd += ["-ss", str(ca.get("trimStart", 0)), "-i", media["path"],
                          "-t", str(ca.get("duration", 999))]

    codec = "libx264" if fmt in ("mp4", "mov") else "libvpx-vp9" if fmt == "webm" else "gif"
    if fmt == "gif":
        final_cmd += ["-vf", "fps=15,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"]
    else:
        final_cmd += ["-c:v", codec, "-crf", str(crf), "-preset", "fast"]
        if audio_clips:
            final_cmd += ["-c:a", "aac", "-b:a", "192k"]

    final_cmd += [
        "-progress", "pipe:1",
        output_path,
    ]

    proc = subprocess.Popen(
        final_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    _jobs[job_id]["process"] = proc

    while True:
        line = proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if line.startswith("out_time_ms="):
            try:
                ms = int(line.split("=")[1])
                yield {"progress": min(99, 80 + int(ms / 1e6 / max(1, 1) * 19))}
            except (ValueError, ZeroDivisionError):
                pass

    proc.wait()
    if proc.returncode != 0:
        err = proc.stderr.read()
        raise RuntimeError(f"FFmpeg render failed: {err[-500:]}")

    yield {"progress": 100, "status": "done"}

    # Cleanup temp
    import shutil
    shutil.rmtree(tmpdir, ignore_errors=True)
