import React, { useRef, RefObject } from 'react';
import { useTimelineStore } from '../../store/timelineStore';

function getTickInterval(zoom: number): number {
  const secondsPerPixel = 1 / zoom;
  const targetPixelsBetweenTicks = 80;
  const targetSeconds = secondsPerPixel * targetPixelsBetweenTicks;

  const intervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  for (const iv of intervals) {
    if (iv >= targetSeconds) return iv;
  }
  return 600;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const sFixed = s % 1 === 0 ? String(s) : s.toFixed(1);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}`;
  if (m > 0) return `${m}:${String(Math.floor(s)).padStart(2, '0')}`;
  return `${sFixed}s`;
}

interface Props {
  zoom: number;
  width: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  sceneMarkers?: number[];
}

export function TimeRuler({ zoom, width, scrollRef, sceneMarkers = [] }: Props) {
  const { playhead, setPlayhead, setPlaying } = useTimelineStore();
  const interval = getTickInterval(zoom);

  const ticks: number[] = [];
  const maxSeconds = width / zoom;
  for (let t = 0; t <= maxSeconds; t += interval) {
    ticks.push(parseFloat(t.toFixed(3)));
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const x = e.clientX - rect.left + scrollLeft;
    const time = x / zoom;
    setPlayhead(time);
    setPlaying(false);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        height: 28,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        cursor: 'pointer',
        userSelect: 'none',
        width,
      }}
    >
      <svg width={width} height={28} style={{ display: 'block' }}>
        {/* Background */}
        <rect width={width} height={28} fill="var(--bg-surface)" />

        {/* Ticks */}
        {ticks.map(t => {
          const x = t * zoom;
          const isMajor = t % (interval * 5) < 0.001 || interval >= 10;
          return (
            <g key={t}>
              <line
                x1={x} y1={isMajor ? 10 : 18}
                x2={x} y2={28}
                stroke="var(--border)"
                strokeWidth={1}
              />
              {isMajor && (
                <text
                  x={x + 3}
                  y={9}
                  fill="var(--text-muted)"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatTime(t)}
                </text>
              )}
            </g>
          );
        })}

        {/* Scene markers */}
        {sceneMarkers.map((t, i) => (
          <g key={`scene-${i}`}>
            <line
              x1={t * zoom} y1={0}
              x2={t * zoom} y2={28}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <polygon
              points={`${t * zoom - 5},0 ${t * zoom + 5},0 ${t * zoom},8`}
              fill="#f59e0b"
            />
          </g>
        ))}

        {/* Playhead */}
        <line
          x1={playhead * zoom}
          y1={0}
          x2={playhead * zoom}
          y2={28}
          stroke="var(--accent)"
          strokeWidth={2}
        />
        <polygon
          points={`${playhead * zoom - 6},0 ${playhead * zoom + 6},0 ${playhead * zoom},10`}
          fill="var(--accent)"
        />
      </svg>
    </div>
  );
}
