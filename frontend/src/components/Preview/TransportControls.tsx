import React, { RefObject } from 'react';
import {
  SkipBack, SkipForward, Play, Pause, ChevronFirst, ChevronLast,
} from 'lucide-react';
import { useTimelineStore } from '../../store/timelineStore';
import { useProjectStore } from '../../store/projectStore';

function formatTimecode(seconds: number, fps: number = 30): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * fps);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function TransportControls({ videoRef }: Props) {
  const { playhead, isPlaying, setPlayhead, setPlaying, duration } = useTimelineStore();
  const { fps } = useProjectStore();

  function stepFrame(dir: number) {
    setPlayhead(playhead + dir / fps);
  }

  function stepSecond(dir: number) {
    setPlayhead(playhead + dir);
  }

  return (
    <div style={{
      height: 48,
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      flexShrink: 0,
      padding: '0 12px',
    }}>
      {/* Timecode */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        color: 'var(--text-secondary)',
        minWidth: 100,
      }}>
        {formatTimecode(playhead, fps)}
      </span>

      <div style={{ flex: 1 }} />

      <button className="btn" style={{ padding: '4px 6px' }} onClick={() => setPlayhead(0)} title="Go to start">
        <ChevronFirst size={14} />
      </button>
      <button className="btn" style={{ padding: '4px 6px' }} onClick={() => stepFrame(-1)} title="Step back 1 frame (←)">
        <SkipBack size={14} />
      </button>
      <button
        className="btn btn-accent"
        style={{ padding: '6px 16px', minWidth: 60 }}
        onClick={() => setPlaying(!isPlaying)}
        title="Play/Pause (Space)"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button className="btn" style={{ padding: '4px 6px' }} onClick={() => stepFrame(1)} title="Step forward 1 frame (→)">
        <SkipForward size={14} />
      </button>
      <button className="btn" style={{ padding: '4px 6px' }} onClick={() => setPlayhead(duration)} title="Go to end">
        <ChevronLast size={14} />
      </button>

      <div style={{ flex: 1 }} />

      {/* Duration */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
        color: 'var(--text-muted)',
        minWidth: 100,
        textAlign: 'right',
      }}>
        / {formatTimecode(duration, fps)}
      </span>
    </div>
  );
}
