import { create } from 'zustand';
import { MediaFile, SubtitleEntry, ExportSettings } from '../types/editor';

interface ProjectState {
  projectId: string | null;
  projectName: string;
  projectPath: string | null;
  isDirty: boolean;
  fps: number;
  width: number;
  height: number;
  mediaFiles: MediaFile[];
  subtitles: SubtitleEntry[];
  exportDefaults: ExportSettings;

  setProject: (id: string, name: string, path: string) => void;
  setDirty: (dirty: boolean) => void;
  setResolution: (width: number, height: number, fps: number) => void;
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  setMediaFiles: (files: MediaFile[]) => void;
  setSubtitles: (entries: SubtitleEntry[]) => void;
  addSubtitles: (entries: SubtitleEntry[]) => void;
  updateSubtitle: (id: string, updates: Partial<SubtitleEntry>) => void;
  removeSubtitle: (id: string) => void;
  setExportDefaults: (settings: Partial<ExportSettings>) => void;
  reset: () => void;
}

const defaultExport: ExportSettings = {
  format: 'mp4',
  resolution: '1080p',
  fps: 30,
  crf: 23,
  outputPath: '',
};

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  projectName: 'Untitled Project',
  projectPath: null,
  isDirty: false,
  fps: 30,
  width: 1920,
  height: 1080,
  mediaFiles: [],
  subtitles: [],
  exportDefaults: defaultExport,

  setProject: (id, name, path) => set({ projectId: id, projectName: name, projectPath: path, isDirty: false }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setResolution: (width, height, fps) => set({ width, height, fps }),
  addMediaFile: (file) => set(state => ({
    mediaFiles: state.mediaFiles.some(m => m.id === file.id)
      ? state.mediaFiles
      : [...state.mediaFiles, file],
    isDirty: true,
  })),
  removeMediaFile: (id) => set(state => ({
    mediaFiles: state.mediaFiles.filter(m => m.id !== id),
    isDirty: true,
  })),
  setMediaFiles: (files) => set({ mediaFiles: files }),
  setSubtitles: (entries) => set({ subtitles: entries, isDirty: true }),
  addSubtitles: (entries) => set(state => ({
    subtitles: [...state.subtitles, ...entries],
    isDirty: true,
  })),
  updateSubtitle: (id, updates) => set(state => ({
    subtitles: state.subtitles.map(s => s.id === id ? { ...s, ...updates } : s),
    isDirty: true,
  })),
  removeSubtitle: (id) => set(state => ({
    subtitles: state.subtitles.filter(s => s.id !== id),
    isDirty: true,
  })),
  setExportDefaults: (settings) => set(state => ({
    exportDefaults: { ...state.exportDefaults, ...settings },
  })),
  reset: () => set({
    projectId: null,
    projectName: 'Untitled Project',
    projectPath: null,
    isDirty: false,
    mediaFiles: [],
    subtitles: [],
  }),
}));
