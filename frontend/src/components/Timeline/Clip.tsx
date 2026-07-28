import React, { useRef, useState, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { Clip, Track } from '../../types/editor';
import { useTimelineStore } from '../../store/timelineStore';
import { useProjectStore } from '../../store/projectStore';

interface Props {
  clip: Clip;
  track: Track;
  zoom: number;
}

export function ClipBlock({ clip, track, zoom }: Props) {
  const { selectedClipId, selectClip, trimClip, removeClip } = useTimelineStore();
  const { mediaFiles } = useProjectStore();
  const isSelected = selectedClipId === clip.id;
  const media = mediaFiles.find(m => m.id === clip.mediaId);

  const left = clip.startTime * zoom;
  const width = Math.max(clip.duration * zoom, 4);

  const dragOffsetRef = useRef(0);

  const [{ isDragging }, drag] = useDrag({
    type: 'TIMELINE_CLIP',
    item: (monitor) => {
      const el = document.querySelector(`[data-clip-id="${clip.id}"]`) as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        const sourceOffset = monitor.getInitialClientOffset();
        dragOffsetRef.current = sourceOffset ? sourceOffset.x - rect.left : 0;
      }
      return { clipId: clip.id, fromTrackId: track.id, dragOffsetX: dragOffsetRef.current };
    },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  // Trim handles
  const [trimming, setTrimming] = useState<null | 'left' | 'right'>(null);
  const trimStartRef = useRef({ x: 0, trimStart: 0, trimEnd: 0, startTime: 0, duration: 0 });

  function handleTrimMouseDown(side: 'left' | 'right', e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setTrimming(side);
    trimStartRef.current = {
      x: e.clientX,
      trimStart: clip.trimStart,
      trimEnd: clip.trimEnd,
      startTime: clip.startTime,
      duration: clip.duration,
    };

    function onMove(ev: MouseEvent) {
      const dx = (ev.clientX - trimStartRef.current.x) / zoom;
      const { trimStart, trimEnd, startTime, duration } = trimStartRef.current;
      const mediaDuration = media?.duration ?? 999;

      if (side === 'left') {
        const newTrimStart = Math.max(0, Math.min(trimStart + dx, trimEnd - 0.1));
        const deltaTrim = newTrimStart - trimStart;
        const newStartTime = Math.max(0, startTime + deltaTrim);
        const newDuration = duration - deltaTrim;
        trimClip(clip.id, newTrimStart, trimEnd, newDuration, newStartTime);
      } else {
        const newDuration = Math.max(0.1, duration + dx);
        const newTrimEnd = Math.min(mediaDuration, trimStart + newDuration);
        trimClip(clip.id, trimStart, newTrimEnd, newTrimEnd - trimStart, startTime);
      }
    }

    function onUp() {
      setTrimming(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const clipColor = track.type === 'audio' ? 'var(--bg-clip-audio)' : 'var(--bg-clip-video)';

  return (
    <div
      ref={drag}
      data-clip-id={clip.id}
      onClick={e => { e.stopPropagation(); selectClip(clip.id); }}
      style={{
        position: 'absolute',
        left,
        top: 4,
        width,
        height: track.height - 8,
        background: isSelected ? 'var(--bg-clip-selected)' : clipColor,
        border: isSelected ? '2px solid #6c8af7' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        userSelect: 'none',
        boxSizing: 'border-box',
        zIndex: isSelected ? 5 : 1,
      }}
    >
      {/* Waveform background for audio */}
      {track.type === 'audio' && media?.waveformUrl && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(http://localhost:8000${media.waveformUrl})`,
          backgroundSize: `${(media.duration ?? 1) * zoom}px 100%`,
          backgroundPosition: `${-clip.trimStart * zoom}px 0`,
          backgroundRepeat: 'no-repeat',
          opacity: 0.4,
          mixBlendMode: 'screen',
        }} />
      )}

      {/* Clip label */}
      <span style={{
        position: 'absolute',
        left: 6,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 10,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.85)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100% - 20px)',
        pointerEvents: 'none',
      }}>
        {media?.name ?? 'Clip'}
      </span>

      {/* Left trim handle */}
      <div
        onMouseDown={e => handleTrimMouseDown('left', e)}
        style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 6,
          cursor: 'ew-resize',
          background: 'rgba(255,255,255,0.15)',
          zIndex: 10,
        }}
      />
      {/* Right trim handle */}
      <div
        onMouseDown={e => handleTrimMouseDown('right', e)}
        style={{
          position: 'absolute',
          right: 0, top: 0, bottom: 0,
          width: 6,
          cursor: 'ew-resize',
          background: 'rgba(255,255,255,0.15)',
          zIndex: 10,
        }}
      />
    </div>
  );
}
