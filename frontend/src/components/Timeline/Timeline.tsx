import React, { useRef, useCallback } from 'react';
import { useTimelineStore } from '../../store/timelineStore';
import { TimeRuler } from './TimeRuler';
import { Track } from './Track';
import { ZoomIn, ZoomOut } from 'lucide-react';

export function Timeline() {
  const { tracks, zoom, setZoom, duration, sceneMarkers } = useTimelineStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalWidth = Math.max(duration * zoom + 400, 1200);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-base)',
      overflow: 'hidden',
    }}>
      {/* Timeline header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TIMELINE</span>
        <div style={{ flex: 1 }} />
        <button className="btn" style={{ padding: '2px 6px' }} onClick={() => setZoom(zoom / 1.3)} title="Zoom Out (-)">
          <ZoomOut size={12} />
        </button>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoom)}px/s
        </span>
        <button className="btn" style={{ padding: '2px 6px' }} onClick={() => setZoom(zoom * 1.3)} title="Zoom In (+)">
          <ZoomIn size={12} />
        </button>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ width: totalWidth, minHeight: '100%', position: 'relative' }}>
          <TimeRuler zoom={zoom} width={totalWidth} scrollRef={scrollRef} sceneMarkers={sceneMarkers} />

          {tracks.length === 0 && (
            <div style={{
              padding: '40px 20px',
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
            }}>
              Drag clips from the Media Bin onto the timeline, or add a track above.
            </div>
          )}

          {tracks.map(track => (
            <Track key={track.id} track={track} zoom={zoom} />
          ))}
        </div>
      </div>
    </div>
  );
}
