import { create } from 'zustand';
import { Track, Clip, ClipEffects } from '../types/editor';
import { v4 as uuidv4 } from 'uuid';

const MAX_UNDO = 50;

interface TimelineState {
  tracks: Track[];
  playhead: number;
  duration: number;
  zoom: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  undoStack: Track[][];
  redoStack: Track[][];
  sceneMarkers: number[];

  addTrack: (type: Track['type']) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  addClip: (trackId: string, clip: Clip) => void;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (clipId: string, toTrackId: string, newStartTime: number) => void;
  trimClip: (clipId: string, trimStart: number, trimEnd: number, duration: number, startTime: number) => void;
  splitClip: (clipId: string, atTime: number) => void;
  updateClipEffects: (clipId: string, effects: Partial<ClipEffects>) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  setSpeed: (clipId: string, speed: number) => void;
  setVolume: (clipId: string, volume: number) => void;
  setPlayhead: (time: number) => void;
  setZoom: (zoom: number) => void;
  setPlaying: (playing: boolean) => void;
  selectClip: (clipId: string | null) => void;
  selectTrack: (trackId: string | null) => void;
  undo: () => void;
  redo: () => void;
  snapshot: () => void;
  computeDuration: () => void;
  setSceneMarkers: (markers: number[]) => void;
}

function deepCloneTracks(tracks: Track[]): Track[] {
  return JSON.parse(JSON.stringify(tracks));
}

function findClip(tracks: Track[], clipId: string): { clip: Clip; track: Track } | null {
  for (const track of tracks) {
    const clip = track.clips.find(c => c.id === clipId);
    if (clip) return { clip, track };
  }
  return null;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  tracks: [],
  playhead: 0,
  duration: 0,
  zoom: 100,
  isPlaying: false,
  selectedClipId: null,
  selectedTrackId: null,
  undoStack: [],
  redoStack: [],
  sceneMarkers: [],

  snapshot: () => {
    const { tracks, undoStack } = get();
    const newStack = [...undoStack, deepCloneTracks(tracks)];
    if (newStack.length > MAX_UNDO) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  computeDuration: () => {
    const { tracks } = get();
    let max = 0;
    for (const track of tracks) {
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration;
        if (end > max) max = end;
      }
    }
    set({ duration: max });
  },

  addTrack: (type) => {
    const id = uuidv4();
    const names: Record<Track['type'], string> = {
      video: 'Video Track',
      audio: 'Audio Track',
      subtitle: 'Subtitle Track',
    };
    const heights: Record<Track['type'], number> = {
      video: 64,
      audio: 56,
      subtitle: 40,
    };
    const newTrack: Track = {
      id,
      type,
      name: names[type],
      clips: [],
      muted: false,
      locked: false,
      volume: 1,
      height: heights[type],
    };
    set(state => ({ tracks: [...state.tracks, newTrack] }));
  },

  removeTrack: (trackId) => {
    set(state => ({
      tracks: state.tracks.filter(t => t.id !== trackId),
    }));
  },

  updateTrack: (trackId, updates) => {
    set(state => ({
      tracks: state.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t),
    }));
  },

  addClip: (trackId, clip) => {
    get().snapshot();
    set(state => {
      const tracks = state.tracks.map(t =>
        t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
      );
      return { tracks };
    });
    get().computeDuration();
  },

  removeClip: (trackId, clipId) => {
    get().snapshot();
    set(state => ({
      tracks: state.tracks.map(t =>
        t.id === trackId
          ? { ...t, clips: t.clips.filter(c => c.id !== clipId) }
          : t
      ),
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    }));
    get().computeDuration();
  },

  moveClip: (clipId, toTrackId, newStartTime) => {
    get().snapshot();
    set(state => {
      let movingClip: Clip | undefined;
      const tracks = state.tracks.map(t => {
        const found = t.clips.find(c => c.id === clipId);
        if (found) {
          movingClip = found;
          return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
        }
        return t;
      });

      if (!movingClip) return { tracks };

      const clampedStart = Math.max(0, newStartTime);
      const updatedClip: Clip = { ...movingClip, startTime: clampedStart, trackId: toTrackId };

      return {
        tracks: tracks.map(t =>
          t.id === toTrackId ? { ...t, clips: [...t.clips, updatedClip] } : t
        ),
      };
    });
    get().computeDuration();
  },

  trimClip: (clipId, trimStart, trimEnd, duration, startTime) => {
    get().snapshot();
    set(state => ({
      tracks: state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, trimStart, trimEnd, duration, startTime } : c
        ),
      })),
    }));
    get().computeDuration();
  },

  splitClip: (clipId, atTime) => {
    const found = findClip(get().tracks, clipId);
    if (!found) return;
    const { clip } = found;

    const splitOffset = atTime - clip.startTime;
    if (splitOffset <= 0 || splitOffset >= clip.duration) return;

    get().snapshot();

    const clipA: Clip = {
      ...clip,
      id: uuidv4(),
      duration: splitOffset,
      trimEnd: clip.trimStart + splitOffset,
    };
    const clipB: Clip = {
      ...clip,
      id: uuidv4(),
      startTime: atTime,
      duration: clip.duration - splitOffset,
      trimStart: clip.trimStart + splitOffset,
      overlays: JSON.parse(JSON.stringify(clip.overlays)),
    };

    set(state => ({
      tracks: state.tracks.map(t => ({
        ...t,
        clips: t.clips.flatMap(c =>
          c.id === clipId ? [clipA, clipB] : [c]
        ),
      })),
      selectedClipId: null,
    }));
    get().computeDuration();
  },

  updateClipEffects: (clipId, effects) => {
    set(state => ({
      tracks: state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, effects: { ...c.effects, ...effects } } : c
        ),
      })),
    }));
  },

  updateClip: (clipId, updates) => {
    set(state => ({
      tracks: state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
      })),
    }));
  },

  setSpeed: (clipId, speed) => {
    set(state => ({
      tracks: state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, speed } : c
        ),
      })),
    }));
  },

  setVolume: (clipId, volume) => {
    set(state => ({
      tracks: state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, volume } : c
        ),
      })),
    }));
  },

  setPlayhead: (time) => set({ playhead: Math.max(0, time) }),
  setZoom: (zoom) => set({ zoom: Math.max(20, Math.min(500, zoom)) }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),
  setSceneMarkers: (markers) => set({ sceneMarkers: markers }),

  undo: () => {
    const { undoStack, tracks, redoStack } = get();
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      tracks: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, deepCloneTracks(tracks)],
      selectedClipId: null,
    });
    get().computeDuration();
  },

  redo: () => {
    const { redoStack, tracks, undoStack } = get();
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    set({
      tracks: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, deepCloneTracks(tracks)],
      selectedClipId: null,
    });
    get().computeDuration();
  },
}));
