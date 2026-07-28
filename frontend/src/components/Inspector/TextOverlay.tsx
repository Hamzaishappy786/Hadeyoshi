import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Clip, TextOverlay } from '../../types/editor';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  clip: Clip;
  onChange: (overlays: TextOverlay[]) => void;
}

const defaultOverlay = (): TextOverlay => ({
  id: uuidv4(),
  text: 'Text',
  startTime: 0,
  duration: 3,
  x: 50,
  y: 50,
  fontSize: 48,
  color: '#ffffff',
  fontFamily: 'Inter',
  bold: false,
  italic: false,
});

export function TextOverlayPanel({ clip, onChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function addOverlay() {
    const ov = defaultOverlay();
    onChange([...clip.overlays, ov]);
    setExpanded(ov.id);
  }

  function removeOverlay(id: string) {
    onChange(clip.overlays.filter(o => o.id !== id));
    if (expanded === id) setExpanded(null);
  }

  function updateOverlay(id: string, updates: Partial<TextOverlay>) {
    onChange(clip.overlays.map(o => o.id === id ? { ...o, ...updates } : o));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="section-label" style={{ margin: 0 }}>Text Overlays</div>
        <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={addOverlay}>
          <Plus size={11} /> Add
        </button>
      </div>

      {clip.overlays.length === 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No text overlays</span>
      )}

      {clip.overlays.map(ov => (
        <div key={ov.id} style={{
          border: '1px solid var(--border)',
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
        }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', cursor: 'pointer',
            }}
            onClick={() => setExpanded(expanded === ov.id ? null : ov.id)}
          >
            <span style={{ fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {ov.text || '(empty)'}
            </span>
            <button
              className="btn btn-danger"
              style={{ padding: '2px 6px', fontSize: 10, flexShrink: 0 }}
              onClick={e => { e.stopPropagation(); removeOverlay(ov.id); }}
            >
              <Trash2 size={10} />
            </button>
          </div>

          {expanded === ov.id && (
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Text</label>
                <input
                  type="text"
                  value={ov.text}
                  onChange={e => updateOverlay(ov.id, { text: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Font size, color */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Size (px)</label>
                  <input
                    type="number"
                    value={ov.fontSize}
                    min={8} max={256}
                    onChange={e => updateOverlay(ov.id, { fontSize: parseInt(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Color</label>
                  <input
                    type="color"
                    value={ov.color}
                    onChange={e => updateOverlay(ov.id, { color: e.target.value })}
                  />
                </div>
              </div>

              {/* Position */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>X (%)</label>
                  <input type="range" min={0} max={100} value={ov.x} onChange={e => updateOverlay(ov.id, { x: parseInt(e.target.value) })} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Y (%)</label>
                  <input type="range" min={0} max={100} value={ov.y} onChange={e => updateOverlay(ov.id, { y: parseInt(e.target.value) })} />
                </div>
              </div>

              {/* Timing */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Start (s)</label>
                  <input type="number" min={0} step={0.1} value={ov.startTime} onChange={e => updateOverlay(ov.id, { startTime: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Duration (s)</label>
                  <input type="number" min={0.1} step={0.1} value={ov.duration} onChange={e => updateOverlay(ov.id, { duration: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
