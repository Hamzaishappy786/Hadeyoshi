import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTimelineStore } from '../../store/timelineStore';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { getPreviewFrame, listLuts } from '../../api/effects';
import { Clip, ClipEffects, TextOverlay } from '../../types/editor';
import { VideoEffects } from './VideoEffects';
import { AudioEffects } from './AudioEffects';
import { TextOverlayPanel } from './TextOverlay';
import { SpeedControl } from './SpeedControl';

export function Inspector() {
  const { selectedClipId, tracks, updateClipEffects, updateClip } = useTimelineStore();
  const { mediaFiles } = useProjectStore();
  const { setPreviewFrame } = useUiStore();
  const [luts, setLuts] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const selectedTrack = selectedClip
    ? tracks.find(t => t.clips.some(c => c.id === selectedClip.id))
    : null;

  useEffect(() => {
    listLuts().then(setLuts).catch(() => setLuts([]));
  }, []);

  function triggerPreview(effects: Partial<ClipEffects>, overlays?: TextOverlay[]) {
    if (!selectedMedia || !selectedClip) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const frame = await getPreviewFrame({
          clip_path: selectedMedia.path,
          timecode: useTimelineStore.getState().playhead - selectedClip.startTime + selectedClip.trimStart,
          effects: { ...selectedClip.effects, ...effects },
          text_overlays: overlays ?? selectedClip.overlays,
        });
        setPreviewFrame(frame);
      } catch {
        setPreviewFrame(null);
      }
    }, 300);
  }

  function handleEffectChange(effects: Partial<ClipEffects>) {
    if (!selectedClip) return;
    updateClipEffects(selectedClip.id, effects);
    triggerPreview(effects);
  }

  if (!selectedClip) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)',
        fontSize: 12,
        flexDirection: 'column',
        gap: 8,
      }}>
        <span>No clip selected</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
          Click a clip on the timeline
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      background: 'var(--bg-surface)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>INSPECTOR</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedMedia?.name}
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Speed */}
        <SpeedControl clip={selectedClip} onChange={speed => updateClip(selectedClip.id, { speed })} />

        <div className="divider" />

        {/* Audio */}
        <AudioEffects clip={selectedClip} onChange={updates => updateClip(selectedClip.id, updates)} />

        {selectedTrack?.type !== 'audio' && (
          <>
            <div className="divider" />
            {/* Color effects */}
            <VideoEffects
              effects={selectedClip.effects}
              luts={luts}
              onChange={handleEffectChange}
            />

            <div className="divider" />
            {/* Text overlays */}
            <TextOverlayPanel
              clip={selectedClip}
              onChange={overlays => {
                updateClip(selectedClip.id, { overlays });
                triggerPreview(selectedClip.effects, overlays);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
