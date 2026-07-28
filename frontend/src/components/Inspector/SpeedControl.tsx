import React from 'react';
import { Clip } from '../../types/editor';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

interface Props {
  clip: Clip;
  onChange: (speed: number) => void;
}

export function SpeedControl({ clip, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="section-label">Playback Speed</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {SPEEDS.map(s => (
          <button
            key={s}
            className="btn"
            style={{
              padding: '3px 8px',
              fontSize: 11,
              background: clip.speed === s ? 'var(--accent)' : undefined,
              borderColor: clip.speed === s ? 'var(--accent)' : undefined,
              color: clip.speed === s ? '#fff' : undefined,
            }}
            onClick={() => onChange(s)}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
