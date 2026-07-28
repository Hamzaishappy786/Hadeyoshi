import React, { useState } from 'react';
import { useDrop, useDragLayer } from 'react-dnd';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';
import { Track as TrackType, Clip as ClipType } from '../../types/editor';
import { useTimelineStore } from '../../store/timelineStore';
import { useProjectStore } from '../../store/projectStore';
import { ClipBlock } from './Clip';
import { DEFAULT_EFFECTS } from '../../types/editor';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  track: TrackType;
  zoom: number;
}

export function Track({ track, zoom }: Props) {
  const { addClip, moveClip, removeTrack, updateTrack, selectClip } = useTimelineStore();
  const { mediaFiles } = useProjectStore();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(track.name);

  // Detect any active drag globally — HTML5 backend's isOver can miss events
  // when the pointer passes over absolutely-positioned child clips
  const { isDraggingAny, dragItemType } = useDragLayer(monitor => ({
    isDraggingAny: monitor.isDragging(),
    dragItemType: monitor.getItemType() as string | null,
  }));

  const [{ isOver, dragType }, drop] = useDrop({
    accept: ['MEDIA_CLIP', 'TIMELINE_CLIP'],
    drop: (item: { mediaId?: string; clipId?: string; fromTrackId?: string; dragOffsetX?: number }, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset) return;

      const el = document.querySelector(`[data-track-id="${track.id}"]`) as HTMLElement;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollLeft = el.closest('[data-timeline-scroll]')?.scrollLeft ?? 0;
      const rawX = offset.x - rect.left + (scrollLeft as number);

      if (item.mediaId) {
        const media = mediaFiles.find(m => m.id === item.mediaId);
        if (!media) return;
        const startTime = Math.max(0, rawX / zoom);
        const newClip: ClipType = {
          id: uuidv4(),
          mediaId: media.id,
          trackId: track.id,
          startTime,
          duration: media.duration,
          trimStart: 0,
          trimEnd: media.duration,
          speed: 1,
          volume: 1,
          muted: false,
          effects: { ...DEFAULT_EFFECTS },
          overlays: [],
        };
        addClip(track.id, newClip);
        // Auto-select the new clip so it shows in preview immediately
        setTimeout(() => selectClip(newClip.id), 0);
      } else if (item.clipId) {
        const dragOff = item.dragOffsetX ?? 0;
        const startTime = Math.max(0, (rawX - dragOff) / zoom);
        moveClip(item.clipId, track.id, startTime);
        setTimeout(() => selectClip(item.clipId!), 0);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      dragType: monitor.getItemType() as string | null,
    }),
  });

  // Fallback: track mouse presence natively for when react-dnd's isOver misses events
  // (HTML5 backend loses the target when pointer passes over absolutely-positioned child clips)
  const [mouseInside, setMouseInside] = useState(false);
  const acceptedTypes = ['MEDIA_CLIP', 'TIMELINE_CLIP'];
  const showDropHint = isOver || (isDraggingAny && mouseInside && acceptedTypes.includes(dragItemType ?? ''));
  const isMovingExisting = (dragType ?? dragItemType) === 'TIMELINE_CLIP';

  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', minHeight: track.height }}>

      {/* Track header */}
      <div style={{ width: 130, flexShrink: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={() => { updateTrack(track.id, { name: nameValue }); setEditingName(false); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { updateTrack(track.id, { name: nameValue }); setEditingName(false); } }}
            style={{ fontSize: 11, padding: '2px 4px', width: '100%' }}
          />
        ) : (
          <span
            style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            onDoubleClick={() => setEditingName(true)}
            title="Double-click to rename"
          >
            {track.name}
          </span>
        )}

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={() => updateTrack(track.id, { muted: !track.muted })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: track.muted ? 'var(--danger)' : 'var(--text-muted)', padding: 2 }}
            title={track.muted ? 'Unmute' : 'Mute'}
          >
            {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          <button
            onClick={() => { if (track.clips.length === 0) removeTrack(track.id); }}
            disabled={track.clips.length > 0}
            style={{ background: 'none', border: 'none', cursor: track.clips.length === 0 ? 'pointer' : 'not-allowed', color: track.clips.length === 0 ? 'var(--danger)' : 'var(--text-muted)', padding: 2, opacity: track.clips.length > 0 ? 0.3 : 1 }}
            title={track.clips.length > 0 ? 'Remove clips first' : 'Remove track'}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={drop}
        data-track-id={track.id}
        onClick={() => selectClip(null)}
        onMouseEnter={() => setMouseInside(true)}
        onMouseLeave={() => setMouseInside(false)}
        style={{
          flex: 1,
          position: 'relative',
          background: showDropHint ? 'rgba(79, 110, 247, 0.1)' : 'var(--bg-track)',
          minHeight: track.height,
          transition: 'background 0.1s',
          border: showDropHint ? '1px dashed rgba(79,110,247,0.5)' : '1px solid transparent',
          boxSizing: 'border-box',
        }}
      >
        {track.clips.map(clip => (
          <ClipBlock key={clip.id} clip={clip} track={track} zoom={zoom} />
        ))}

        {/* Drop hint overlay */}
        {showDropHint && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 100,
          }}>
            <div style={{
              background: 'rgba(79,110,247,0.28)',
              border: '1.5px solid rgba(130,160,255,0.85)',
              borderRadius: 6,
              padding: '6px 18px',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 12px rgba(79,110,247,0.4)',
              letterSpacing: '0.02em',
            }}>
              {isMovingExisting ? 'Move to this layer' : '+ Add to this layer'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
