import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Film, Music, Image, X } from 'lucide-react';
import { MediaFile } from '../../types/editor';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Loading card ──────────────────────────────────────────────────────────────
interface LoadingProps {
  loading: true;
  name: string;
  framePreview: string | null;
  onCancel: () => void;
}

function LoadingCard({ name, framePreview, onCancel }: LoadingProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <>
      <style>{`@keyframes vedit-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', position: 'relative', userSelect: 'none' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#0a0a0a' }}>
          {framePreview && (
            <img
              src={framePreview}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(5px) brightness(0.45)', transform: 'scale(1.06)', pointerEvents: 'none' }}
            />
          )}

          {/* Spinner */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.18)', borderTopColor: 'var(--accent)', animation: 'vedit-spin 0.75s linear infinite' }} />
          </div>

          {/* Cancel X on hover */}
          {hovered && (
            <button
              onClick={e => { e.stopPropagation(); onCancel(); }}
              title="Cancel import"
              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 5 }}
            >
              <X size={11} />
            </button>
          )}
        </div>
        <div style={{ padding: '4px 6px', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
      </div>
    </>
  );
}

// ── Imported card ─────────────────────────────────────────────────────────────
interface ImportedProps {
  loading?: false;
  media: MediaFile;
  onDelete: () => void;
}

function ImportedCard({ media, onDelete }: ImportedProps) {
  const [hovered, setHovered] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'MEDIA_CLIP',
    item: { mediaId: media.id },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  const Icon = media.type === 'video' ? Film : media.type === 'audio' ? Music : Image;

  return (
    <div
      ref={drag}
      style={{ background: 'var(--bg-elevated)', border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, overflow: 'hidden', cursor: 'grab', opacity: isDragging ? 0.4 : 1, userSelect: 'none', transition: 'border-color 0.12s', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {media.thumbnailUrl ? (
          <img src={`http://localhost:8000${media.thumbnailUrl}`} alt={media.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Icon size={24} color="var(--text-muted)" strokeWidth={1} />
        )}

        {/* Duration badge */}
        <span style={{ position: 'absolute', bottom: 3, right: 4, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#fff', background: 'rgba(0,0,0,0.7)', padding: '1px 4px', borderRadius: 3 }}>
          {formatDuration(media.duration)}
        </span>

        {/* Delete X on hover */}
        {hovered && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Remove from bin"
            style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(180,30,30,0.88)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 5 }}
          >
            <X size={11} />
          </button>
        )}
      </div>

      <div style={{ padding: '4px 6px', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {media.name}
      </div>
    </div>
  );
}

// ── Unified export ────────────────────────────────────────────────────────────
export function ClipCard(props: LoadingProps | ImportedProps) {
  if (props.loading) return <LoadingCard {...props} />;
  return <ImportedCard {...props} />;
}
