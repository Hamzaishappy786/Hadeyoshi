import React, { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

import { Toolbar } from './components/Toolbar/Toolbar';
import { ClipBin } from './components/ClipBin/ClipBin';
import { PreviewPlayer } from './components/Preview/PreviewPlayer';
import { Inspector } from './components/Inspector/Inspector';
import { Timeline } from './components/Timeline/Timeline';
import { ExportModal } from './components/Toolbar/ExportModal';

import { useUiStore } from './store/uiStore';
import { useProjectStore } from './store/projectStore';
import { useTimelineStore } from './store/timelineStore';
import { useTimelineKeyboard } from './hooks/useTimeline';

import { SplashScreen } from './components/SplashScreen';

export default function App() {
  const { activeModal, showSplash, toasts, removeToast, addToast } = useUiStore();
  const { projectName, isDirty, setProject, setDirty, setMediaFiles, setSubtitles, fps, width, height } = useProjectStore();
  const { tracks, setPlaying } = useTimelineStore();

  useTimelineKeyboard();

  // Window title
  useEffect(() => {
    document.title = `Video Editor — ${projectName}${isDirty ? ' •' : ''}`;
  }, [projectName, isDirty]);

  // Save handler — auto-saves to ~/Documents/VideoEditorProjects/ with no dialog
  async function handleSave() {
    if (!window.electronAPI) { addToast('Save only available in Electron', 'error'); return; }

    const { mediaFiles, subtitles } = useProjectStore.getState();
    const data = JSON.stringify({
      version: '1.0.0',
      project: {
        name: projectName,
        fps, width, height,
        tracks: useTimelineStore.getState().tracks,
        subtitles,
        mediaFiles,
      },
    }, null, 2);

    try {
      const { filePath } = await window.electronAPI.saveProjectAuto(projectName, data);
      setProject('local', projectName, filePath);
      setDirty(false);
      addToast('Project saved', 'success');
    } catch (e: unknown) {
      addToast(`Save failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  }

  async function handleLoad() {
    if (!window.electronAPI) { addToast('Load only available in Electron', 'error'); return; }

    const result = await window.electronAPI.openFile({
      title: 'Open Project',
      filters: [{ name: 'Video Editor Project', extensions: ['vedit.json', 'json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return;

    await handleOpenPath(result.filePaths[0]);
  }

  async function handleOpenPath(filePath: string) {
    if (!window.electronAPI) return;
    try {
      const raw = await window.electronAPI.readFile(filePath);
      const data = JSON.parse(raw);
      const proj = data.project;
      useTimelineStore.setState({ tracks: proj.tracks ?? [], playhead: 0, undoStack: [], redoStack: [] });
      useTimelineStore.getState().computeDuration();
      useProjectStore.getState().setResolution(proj.width ?? 1920, proj.height ?? 1080, proj.fps ?? 30);
      setMediaFiles(proj.mediaFiles ?? []);
      setSubtitles(proj.subtitles ?? []);
      setProject('local', proj.name, filePath);
      setDirty(false);
      useUiStore.getState().setShowSplash(false);
      addToast(`Loaded: ${proj.name}`, 'success');
    } catch (e: unknown) {
      addToast(`Failed to load: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  }

  // Custom events from keyboard hook
  useEffect(() => {
    document.addEventListener('app:save', handleSave);
    document.addEventListener('app:open', handleLoad);
    return () => {
      document.removeEventListener('app:save', handleSave);
      document.removeEventListener('app:open', handleLoad);
    };
  }, [projectName]);

  // Mark dirty on any track change
  useEffect(() => {
    const unsub = useTimelineStore.subscribe(() => {
      if (!useProjectStore.getState().isDirty) {
        useProjectStore.getState().setDirty(true);
      }
    });
    return unsub;
  }, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Toolbar onNewProject={() => useUiStore.getState().openModal('new-project')} onSave={handleSave} onLoad={handleLoad} />

        <PanelGroup direction="vertical" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Top section: ClipBin | Preview | Inspector */}
          <Panel defaultSize={65} minSize={30}>
            <PanelGroup direction="horizontal" style={{ height: '100%' }}>
              <Panel defaultSize={20} minSize={12} maxSize={35}>
                <ClipBin />
              </Panel>
              <PanelResizeHandle />
              <Panel defaultSize={55} minSize={30}>
                <PreviewPlayer />
              </Panel>
              <PanelResizeHandle />
              <Panel defaultSize={25} minSize={15} maxSize={40}>
                <Inspector />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle />

          {/* Timeline */}
          <Panel defaultSize={35} minSize={20} maxSize={70}>
            <div data-timeline-scroll style={{ height: '100%' }}>
              <Timeline />
            </div>
          </Panel>
        </PanelGroup>

        {/* Modals */}
        {activeModal === 'export' && <ExportModal />}
        {activeModal === 'new-project' && <NewProjectModal />}

        {/* Splash screen */}
        {showSplash && <SplashScreen onClose={() => useUiStore.getState().setShowSplash(false)} onLoad={handleLoad} onOpenPath={handleOpenPath} />}

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(toast => (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
                background: toast.type === 'error' ? '#3b1010' : toast.type === 'success' ? '#0e2b17' : '#1a1a2e',
                border: `1px solid ${toast.type === 'error' ? 'var(--danger)' : toast.type === 'success' ? 'var(--success)' : 'var(--border)'}`,
                color: 'var(--text-primary)',
                maxWidth: 320,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </DndProvider>
  );
}

function NewProjectModal() {
  const { closeModal, addToast } = useUiStore();
  const [name, setName] = React.useState('My Project');
  const [resolution, setResolution] = React.useState<'720p' | '1080p' | '4k'>('1080p');
  const [fps, setFps] = React.useState(30);

  const resMap = { '720p': [1280, 720], '1080p': [1920, 1080], '4k': [3840, 2160] };

  function create() {
    const [w, h] = resMap[resolution];
    useProjectStore.getState().reset();
    useProjectStore.getState().setProject('new-' + Date.now(), name, '');
    useProjectStore.getState().setResolution(w, h, fps);
    useTimelineStore.setState({ tracks: [], playhead: 0, duration: 0, undoStack: [], redoStack: [] });
    useUiStore.getState().setShowSplash(false);
    closeModal();
    addToast(`Created: ${name}`, 'success');
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, width: 360, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>New Project</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Project Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Resolution</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['720p', '1080p', '4k'] as const).map(r => (
              <button key={r} className="btn" style={{ flex: 1, background: resolution === r ? 'var(--accent)' : undefined, color: resolution === r ? '#fff' : undefined, borderColor: resolution === r ? 'var(--accent)' : undefined }} onClick={() => setResolution(r)}>{r}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Frame Rate</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[24, 30, 60].map(f => (
              <button key={f} className="btn" style={{ flex: 1, background: fps === f ? 'var(--accent)' : undefined, color: fps === f ? '#fff' : undefined, borderColor: fps === f ? 'var(--accent)' : undefined }} onClick={() => setFps(f)}>{f} fps</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={closeModal}>Cancel</button>
          <button className="btn btn-accent" onClick={create} disabled={!name.trim()}>Create Project</button>
        </div>
      </div>
    </div>
  );
}
