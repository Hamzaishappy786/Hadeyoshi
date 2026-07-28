export type MediaType = 'video' | 'audio' | 'image';

export interface MediaFile {
  id: string;
  name: string;
  path: string;
  type: MediaType;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  thumbnailUrl?: string;
  waveformUrl?: string;
}

export interface ClipEffects {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  sharpen: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  lutPath?: string;
  reversed: boolean;
  backgroundRemoved: boolean;
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  backgroundColor?: string;
}

export interface Transition {
  type: 'none' | 'crossfade' | 'wipe-left' | 'wipe-right';
  duration: number;
}

export interface Clip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
  volume: number;
  muted: boolean;
  effects: ClipEffects;
  overlays: TextOverlay[];
  transition?: Transition;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'subtitle';
  name: string;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  volume: number;
  height: number;
}

export interface SubtitleEntry {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  tracks: Track[];
  subtitles: SubtitleEntry[];
  mediaFiles: MediaFile[];
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm' | 'gif';
  resolution: '480p' | '720p' | '1080p' | '4k' | 'source';
  fps: number;
  crf: number;
  outputPath: string;
}

export const DEFAULT_EFFECTS: ClipEffects = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sharpen: 0,
  fadeInDuration: 0,
  fadeOutDuration: 0,
  reversed: false,
  backgroundRemoved: false,
};
