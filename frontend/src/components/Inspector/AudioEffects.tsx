import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Clip } from '../../types/editor';

interface Props {
  clip: Clip;
  onChange: (updates: Partial<Clip>) => void;
}

export function AudioEffects({ clip, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="section-label">Audio</div>

      {/* Volume */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Volume</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {Math.round(clip.volume * 100)}%
          </span>
        </div>
        <input
          type="range" min={0} max={2} step={0.01}
          value={clip.volume}
          onChange={e => onChange({ volume: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Mute */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11 }}>
        <input
          type="checkbox"
          checked={clip.muted}
          onChange={e => onChange({ muted: e.target.checked })}
        />
        <span style={{ color: 'var(--text-secondary)' }}>Muted</span>
      </label>

      {/* Fade in */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Fade In</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {clip.effects.fadeInDuration.toFixed(1)}s
          </span>
        </div>
        <input
          type="range" min={0} max={5} step={0.1}
          value={clip.effects.fadeInDuration}
          onChange={e => onChange({ effects: { ...clip.effects, fadeInDuration: parseFloat(e.target.value) } })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Fade out */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Fade Out</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {clip.effects.fadeOutDuration.toFixed(1)}s
          </span>
        </div>
        <input
          type="range" min={0} max={5} step={0.1}
          value={clip.effects.fadeOutDuration}
          onChange={e => onChange({ effects: { ...clip.effects, fadeOutDuration: parseFloat(e.target.value) } })}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
