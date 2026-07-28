import React, { useState, useEffect, useRef } from 'react';
import { X, Download, XCircle } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useUiStore } from '../../store/uiStore';
import { startExport, cancelExport, createProgressStream } from '../../api/export';
import { ExportSettings, Project } from '../../types/editor';

const QUALITY_LABELS: Record<number, string> = {
  15: 'Visually Lossless',
  18: 'Very High',
  23: 'High',
  28: 'Medium',
  35: 'Small File',
};

function nearestLabel(crf: number): string {
  const keys = Object.keys(QUALITY_LABELS).map(Number);
  const nearest = keys.reduce((a, b) => Math.abs(b - crf) < Math.abs(a - crf) ? b : a);
  return QUALITY_LABELS[nearest];
}

export function ExportModal() {
  const { closeModal } = useUiStore();
  const { exportDefaults, setExportDefaults, projectName, fps: projectFps, width, height, mediaFiles, subtitles } = useProjectStore();
  const { tracks } = useTimelineStore();
  const { addToast } = useUiStore();

  const [settings, setSettings] = useState<ExportSettings>({
    ...exportDefaults,
    outputPath: exportDefaults.outputPath || `C:\\Users\\gamer\\Videos\\${projectName}.mp4`,
  });

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportFps, setExportFps] = useState(0);
  const [eta, setEta] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const durationSeconds = (() => {
    let max = 0;
    for (const t of tracks) for (const c of t.clips) {
      const end = c.startTime + c.duration;
      if (end > max) max = end;
    }
    return max;
  })();

  const resMap: Record<string, [number, number] | null> = {
    '480p': [854, 480], '720p': [1280, 720], '1080p': [1920, 1080], '4k': [3840, 2160], 'source': null,
  };
  const res = resMap[settings.resolution];
  const estimatedBitrate = settings.crf < 20 ? 8000 : settings.crf < 25 ? 4000 : settings.crf < 30 ? 2000 : 1000;
  const estimatedMB = Math.round((estimatedBitrate * durationSeconds) / 8 / 1000);

  async function handleExport() {
    const project: Project = {
      id: 'export',
      name: projectName,
      path: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      duration: durationSeconds,
      fps: projectFps,
      width, height,
      tracks,
      subtitles,
      mediaFiles,
    };

    setExporting(true);
    setProgress(0);

    try {
      const id = await startExport(project, settings);
      setJobId(id);

      esRef.current = createProgressStream(
        id,
        data => { setProgress(data.progress); setExportFps(data.fps); setEta(data.eta); },
        () => { setExporting(false); addToast('Export complete!', 'success'); closeModal(); },
        err => { setExporting(false); addToast(`Export failed: ${err}`, 'error'); },
      );
    } catch (e: unknown) {
      setExporting(false);
      addToast(`Export failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  }

  async function handleCancel() {
    if (jobId) {
      await cancelExport(jobId);
      esRef.current?.close();
      setExporting(false);
      setJobId(null);
    }
  }

  async function pickOutputPath() {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFile({
      title: 'Choose Output Directory',
      properties: ['openDirectory'],
    });
    if (!result.canceled && result.filePaths.length) {
      setSettings(s => ({ ...s, outputPath: `${result.filePaths[0]}\\${projectName}.${s.format}` }));
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        width: 480,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Export Video</span>
          <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Format */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Format</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['mp4', 'mov', 'webm', 'gif'] as const).map(f => (
                <button key={f} className="btn" style={{
                  flex: 1,
                  background: settings.format === f ? 'var(--accent)' : undefined,
                  borderColor: settings.format === f ? 'var(--accent)' : undefined,
                  color: settings.format === f ? '#fff' : undefined,
                }} onClick={() => setSettings(s => ({ ...s, format: f }))}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Resolution</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['source', '480p', '720p', '1080p', '4k'] as const).map(r => (
                <button key={r} className="btn" style={{
                  background: settings.resolution === r ? 'var(--accent)' : undefined,
                  borderColor: settings.resolution === r ? 'var(--accent)' : undefined,
                  color: settings.resolution === r ? '#fff' : undefined,
                }} onClick={() => setSettings(s => ({ ...s, resolution: r }))}>
                  {r === 'source' ? 'Source' : r}
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Frame Rate</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[24, 30, 60].map(f => (
                <button key={f} className="btn" style={{
                  background: settings.fps === f ? 'var(--accent)' : undefined,
                  borderColor: settings.fps === f ? 'var(--accent)' : undefined,
                  color: settings.fps === f ? '#fff' : undefined,
                }} onClick={() => setSettings(s => ({ ...s, fps: f }))}>
                  {f} fps
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {settings.format !== 'gif' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Quality</label>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}>{nearestLabel(settings.crf)} (CRF {settings.crf})</span>
              </div>
              <input type="range" min={15} max={35} step={1} value={settings.crf}
                onChange={e => setSettings(s => ({ ...s, crf: parseInt(e.target.value) }))}
                style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                <span>High Quality</span><span>Small File</span>
              </div>
            </div>
          )}

          {/* Output path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Output Path</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={settings.outputPath}
                onChange={e => setSettings(s => ({ ...s, outputPath: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={pickOutputPath}>Browse</button>
            </div>
          </div>

          {/* Estimate */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Estimated size: ~{estimatedMB} MB · Duration: {Math.round(durationSeconds)}s
          </div>

          {/* Progress */}
          {exporting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'var(--accent)',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{progress}%</span>
                {exportFps > 0 && <span>{exportFps} fps</span>}
                {eta && <span>ETA: {eta}</span>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            {exporting ? (
              <button className="btn btn-danger" onClick={handleCancel}>
                <XCircle size={13} /> Cancel
              </button>
            ) : (
              <>
                <button className="btn" onClick={closeModal}>Cancel</button>
                <button className="btn btn-accent" onClick={handleExport} disabled={!tracks.some(t => t.clips.length > 0)}>
                  <Download size={13} /> Start Export
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
