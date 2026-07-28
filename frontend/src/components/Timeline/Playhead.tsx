import React from 'react';
import { useTimelineStore } from '../../store/timelineStore';

interface Props {
  zoom: number;
  height: number;
}

export function Playhead({ zoom, height }: Props) {
  const { playhead } = useTimelineStore();
  const x = playhead * zoom;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        bottom: 0,
        width: 2,
        background: 'var(--accent)',
        zIndex: 20,
        pointerEvents: 'none',
      }}
    />
  );
}
