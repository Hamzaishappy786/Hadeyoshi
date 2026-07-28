import React from 'react';
import { ClipEffects } from '../../types/editor';

interface Props {
  effects: ClipEffects;
  luts: string[];
  onChange: (effects: Partial<ClipEffects>) => void;
}

function Slider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

export function VideoEffects({ effects, luts, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="section-label">Color Grade</div>

      <Slider label="Brightness" value={effects.brightness} min={-100} max={100} onChange={v => onChange({ brightness: v })} />
      <Slider label="Contrast" value={effects.contrast} min={-100} max={100} onChange={v => onChange({ contrast: v })} />
      <Slider label="Saturation" value={effects.saturation} min={-100} max={100} onChange={v => onChange({ saturation: v })} />
      <Slider label="Hue" value={effects.hue} min={-180} max={180} onChange={v => onChange({ hue: v })} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="section-label" style={{ marginTop: 4 }}>Effects</div>
        <Slider label="Blur" value={effects.blur} min={0} max={20} step={0.5} onChange={v => onChange({ blur: v })} />
        <Slider label="Sharpen" value={effects.sharpen} min={0} max={10} step={0.5} onChange={v => onChange({ sharpen: v })} />
      </div>

      {/* LUT */}
      {luts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="section-label">LUT</div>
          <select
            value={effects.lutPath ?? ''}
            onChange={e => onChange({ lutPath: e.target.value || undefined })}
            style={{ width: '100%' }}
          >
            <option value="">None</option>
            {luts.map(lut => (
              <option key={lut} value={lut}>{lut}</option>
            ))}
          </select>
        </div>
      )}

      <button
        className="btn"
        style={{ marginTop: 4, fontSize: 11 }}
        onClick={() => onChange({
          brightness: 0, contrast: 0, saturation: 0, hue: 0,
          blur: 0, sharpen: 0, lutPath: undefined,
        })}
      >
        Reset Color
      </button>
    </div>
  );
}
