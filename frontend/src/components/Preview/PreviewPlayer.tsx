import React, { useRef, useEffect, useState } from 'react';
import { useTimelineStore } from '../../store/timelineStore';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { TransportControls } from './TransportControls';

export function PreviewPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { playhead, isPlaying, setPlayhead, setPlaying, selectedClipId, tracks } = useTimelineStore();
  const { mediaFiles } = useProjectStore();
  const { previewFrame, setPreviewFrame } = useUiStore();
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // Find selected clip
  const selectedClip = (() => {
    for (const t of tracks) {
      const c = t.clips.find(c => c.id === selectedClipId);
      if (c) return c;
    }
    return null;
  })();

  const selectedMedia = selectedClip
    ? mediaFiles.find(m => m.id === selectedClip.mediaId)
    : null;

  // Build video URL — use file:// directly in Electron (webSecurity: false)
  // which avoids any backend serving latency for local files
  const videoSrc = selectedMedia?.path
    ? 'file:///' + selectedMedia.path.replace(/\\/g, '/')
    : null;

  // Check backend status once
  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.ok ? setBackendOk(true) : setBackendOk(false))
      .catch(() => setBackendOk(false));
  }, []);

  // Clear effect-preview frame when the selected clip changes
  useEffect(() => {
    setPreviewFrame(null);
  }, [selectedClipId]);

  // Reload video when source changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (videoSrc) {
      v.src = videoSrc;
      v.load();
    } else {
      v.src = '';
      v.load();
    }
  }, [videoSrc]);

  // Seek to playhead position when paused
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isPlaying || !selectedClip) return;
    const clipTime = playhead - selectedClip.startTime + selectedClip.trimStart;
    const clamped = Math.max(0, Math.min(clipTime, selectedClip.duration));
    if (Math.abs(v.currentTime - clamped) > 0.05) {
      v.currentTime = clamped;
    }
  }, [playhead, isPlaying, selectedClip]);

  // Playback RAF loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      videoRef.current?.pause();
      return;
    }

    const v = videoRef.current;
    lastTimeRef.current = performance.now();

    function tick(now: number) {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const { playhead: ph, duration, setPlayhead: sp, setPlaying: spl } = useTimelineStore.getState();
      const next = ph + dt;

      if (duration > 0 && next >= duration) {
        sp(duration);
        spl(false);
        v?.pause();
        return;
      }

      sp(next);

      const clip = useTimelineStore.getState().tracks
        .flatMap(t => t.clips)
        .find(c => c.id === useTimelineStore.getState().selectedClipId);

      if (v && clip) {
        const clipTime = next - clip.startTime + clip.trimStart;
        if (clipTime >= 0 && clipTime <= clip.duration) {
          if (v.paused) v.play().catch(() => {});
          if (Math.abs(v.currentTime - clipTime) > 0.15) v.currentTime = clipTime;
        } else {
          v.pause();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000', position: 'relative' }}>

      {/* Video area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

        {/* Video element — always in DOM so src changes work */}
        <video
          ref={videoRef}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: videoSrc ? 'block' : 'none' }}
          preload="auto"
          playsInline
        />

        {/* Effect preview frame overlaid on top when inspector is tweaking and paused */}
        {previewFrame && !isPlaying && (
          <img
            src={previewFrame}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            alt="Effect preview"
          />
        )}

        {/* Empty state */}
        {!videoSrc && (
          <div style={{ position: 'absolute', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            Select a clip to preview<br />
            <span style={{ fontSize: 11 }}>or drag one to the timeline</span>
          </div>
        )}
      </div>

      <TransportControls videoRef={videoRef} />
    </div>
  );
}
