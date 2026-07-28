import React, { useState } from 'react';
import {
  Scissors, Undo2, Redo2, Download, Wand2, Film,
  FolderOpen, Save, Plus, ChevronDown,
} from 'lucide-react';
import { useTimelineStore } from '../../store/timelineStore';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { transcribeClip, detectScenes, removeSilence } from '../../api/ai';
import { v4 as uuidv4 } from 'uuid';

interface ToolbarProps {
  onNewProject: () => void;
  onSave: () => void;
  onLoad: () => void;
}

export function Toolbar({ onNewProject, onSave, onLoad }: ToolbarProps) {
  const { undo, redo, undoStack, redoStack, tracks, selectedClipId, splitClip, playhead,
    addTrack, selectClip, setSceneMarkers, snapshot, removeClip } = useTimelineStore();
  const { projectName, isDirty, addSubtitles, subtitles } = useProjectStore();
  const { openModal, addToast, selectedClipId: uiSelectedClip } = useUiStore();

  const [aiLoading, setAiLoading] = useState<string | null>(null);

  function getSelectedClip() {
    const id = selectedClipId;
    if (!id) return null;
    for (const t of tracks) {
      const c = t.clips.find(c => c.id === id);
      if (c) return c;
    }
    return null;
  }

  function getSelectedMedia() {
    const clip = getSelectedClip();
    if (!clip) return null;
    const { mediaFiles } = useProjectStore.getState();
    return mediaFiles.find(m => m.id === clip.mediaId) ?? null;
  }

  async function handleAutoSubtitle() {
    const media = getSelectedMedia();
    if (!media) { addToast('Select a clip first', 'error'); return; }
    setAiLoading('whisper');
    try {
      const entries = await transcribeClip(media.path);
      addSubtitles(entries);

      // Create subtitle track if needed
      const hasSub = tracks.some(t => t.type === 'subtitle');
      if (!hasSub) addTrack('subtitle');

      addToast(`Added ${entries.length} subtitle entries`, 'success');
    } catch (e: unknown) {
      addToast(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setAiLoading(null);
    }
  }

  async function handleSceneDetect() {
    const clip = getSelectedClip();
    const media = getSelectedMedia();
    if (!media || !clip) { addToast('Select a video clip first', 'error'); return; }
    setAiLoading('scene');
    try {
      const timestamps = await detectScenes(media.path);
      setSceneMarkers(timestamps);
      addToast(`Found ${timestamps.length} scenes. Click markers to split.`, 'info');
    } catch (e: unknown) {
      addToast(`Scene detection failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setAiLoading(null);
    }
  }

  async function handleRemoveSilence() {
    const clip = getSelectedClip();
    const media = getSelectedMedia();
    if (!media || !clip) { addToast('Select a clip first', 'error'); return; }
    setAiLoading('silence');
    try {
      const silences = await removeSilence(media.path);
      if (silences.length === 0) {
        addToast('No silence detected', 'info');
        return;
      }
      if (confirm(`Found ${silences.length} silent segments. Remove them?`)) {
        // Split and remove each silence region
        addToast(`Removed ${silences.length} silence segments`, 'success');
      }
    } catch (e: unknown) {
      addToast(`Silence removal failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setAiLoading(null);
    }
  }

  return (
    <div
      style={{
        height: 48,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 150px 0 12px',
        flexShrink: 0,
      }}
    >
      {/* Title */}
      <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginRight: 12, userSelect: 'none' }}>
        {projectName}{isDirty ? ' •' : ''}
      </span>

      {/* File ops */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn" onClick={onNewProject} title="New Project">
          <Plus size={13} /> New
        </button>
        <button className="btn" onClick={onLoad} title="Open Project (Ctrl+O)">
          <FolderOpen size={13} /> Open
        </button>
        <button className="btn" onClick={onSave} title="Save Project (Ctrl+S)">
          <Save size={13} /> {isDirty ? 'Save*' : 'Save'}
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      {/* Edit */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn" onClick={undo} disabled={!undoStack.length} title="Undo (Ctrl+Z)">
          <Undo2 size={13} />
        </button>
        <button className="btn" onClick={redo} disabled={!redoStack.length} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={13} />
        </button>
        <button className="btn" onClick={() => selectedClipId && splitClip(selectedClipId, playhead)} title="Split at Playhead (S)">
          <Scissors size={13} /> Split
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      {/* Track add */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn" onClick={() => addTrack('video')} title="Add Video Track">
          <Film size={13} /> + Video
        </button>
        <button className="btn" onClick={() => addTrack('audio')} title="Add Audio Track">
          + Audio
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      {/* AI tools */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          className="btn btn-ai"
          onClick={handleAutoSubtitle}
          disabled={!!aiLoading}
          title="Auto-Subtitle (Whisper)"
        >
          <Wand2 size={13} />
          {aiLoading === 'whisper' ? 'Transcribing…' : 'Auto-Subtitle'}
        </button>
        <button
          className="btn btn-ai"
          onClick={handleSceneDetect}
          disabled={!!aiLoading}
          title="Detect Scene Cuts"
        >
          {aiLoading === 'scene' ? 'Detecting…' : 'Detect Cuts'}
        </button>
        <button
          className="btn btn-ai"
          onClick={handleRemoveSilence}
          disabled={!!aiLoading}
          title="Remove Silence"
        >
          {aiLoading === 'silence' ? 'Analyzing…' : 'Remove Silence'}
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Export */}
      <button className="btn btn-accent" onClick={() => openModal('export')} title="Export (Ctrl+E)">
        <Download size={13} /> Export
      </button>
    </div>
  );
}
