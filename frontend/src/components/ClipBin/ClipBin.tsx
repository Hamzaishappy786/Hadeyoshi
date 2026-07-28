import React, { useState } from 'react';
import { Upload, Film } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { importClips } from '../../api/clips';
import { ClipCard } from './ClipCard';
import { MediaFile } from '../../types/editor';

interface ImportingFile {
  id: string;
  path: string;
  name: string;
  framePreview: string | null;
  cancelled: boolean;
  cancel: () => void;
}

async function captureFirstFrame(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      // webSecurity: false in Electron lets us use file:// directly
      video.src = 'file:///' + filePath.replace(/\\/g, '/');
      video.muted = true;
      video.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => { video.src = ''; resolve(null); }, 4000);

      video.addEventListener('loadeddata', () => { video.currentTime = 0.5; }, { once: true });

      video.addEventListener('seeked', () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320; canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.drawImage(video, 0, 0, 320, 180); resolve(canvas.toDataURL('image/jpeg', 0.7)); }
          else resolve(null);
        } catch { resolve(null); }
        finally { video.src = ''; }
      }, { once: true });

      video.addEventListener('error', () => { clearTimeout(timeout); video.src = ''; resolve(null); }, { once: true });
      video.load();
    } catch { resolve(null); }
  });
}

export function ClipBin() {
  const { mediaFiles, addMediaFile, removeMediaFile } = useProjectStore();
  const { addToast } = useUiStore();
  const [importing, setImporting] = useState<ImportingFile[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);

  async function handleImport() {
    if (!window.electronAPI) { addToast('File picker only available in Electron', 'error'); return; }
    const result = await window.electronAPI.openFile({
      title: 'Import Media',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'mp3', 'wav', 'aac', 'm4a', 'jpg', 'jpeg', 'png', 'gif'] }],
    });
    if (result.canceled || !result.filePaths.length) return;

    // Skip already-imported paths
    const existing = new Set(mediaFiles.map(m => m.path));
    const newPaths = result.filePaths.filter(p => !existing.has(p));
    if (!newPaths.length) { addToast('Already imported', 'info'); return; }

    for (const path of newPaths) {
      const id = Math.random().toString(36).slice(2);
      const name = path.split(/[\\/]/).pop() ?? path;
      let cancelled = false;

      const entry: ImportingFile = {
        id, path, name, framePreview: null, cancelled,
        cancel: () => { cancelled = true; setImporting(prev => prev.filter(f => f.id !== id)); },
      };

      setImporting(prev => [...prev, entry]);

      // Capture first frame in parallel (best-effort)
      captureFirstFrame(path).then(frame => {
        if (!cancelled) setImporting(prev => prev.map(f => f.id === id ? { ...f, framePreview: frame } : f));
      });

      // Run import
      importClips([path]).then(imported => {
        if (cancelled) return;
        imported.forEach(addMediaFile);
        setImporting(prev => prev.filter(f => f.id !== id));
      }).catch(e => {
        if (!cancelled) addToast(`Import failed: ${e.message}`, 'error');
        setImporting(prev => prev.filter(f => f.id !== id));
      });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>MEDIA BIN</span>
        <button className="btn btn-accent" onClick={handleImport} style={{ padding: '4px 8px', fontSize: 11 }}>
          <Upload size={12} /> Import
        </button>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignContent: 'start' }}>
        {mediaFiles.length === 0 && importing.length === 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, color: 'var(--text-muted)' }}>
            <Film size={32} strokeWidth={1} />
            <span style={{ fontSize: 12, textAlign: 'center' }}>Click Import to add<br />video, audio, or images</span>
          </div>
        )}

        {/* Loading cards — rendered first */}
        {importing.map(f => (
          <ClipCard key={f.id} loading name={f.name} framePreview={f.framePreview} onCancel={f.cancel} />
        ))}

        {/* Imported cards */}
        {mediaFiles.map(file => (
          <ClipCard key={file.id} media={file} onDelete={() => setDeleteTarget(file)} />
        ))}
      </div>

      {/* Delete confirmation — centered modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 24px', width: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Remove from bin?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Do you really wanna delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>?
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Clips already placed on the timeline won't be affected.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }}
                onClick={() => { removeMediaFile(deleteTarget.id); setDeleteTarget(null); }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
