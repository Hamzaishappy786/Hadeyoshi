import client from './client';
import { ClipEffects, TextOverlay } from '../types/editor';

interface PreviewFrameParams {
  clip_path: string;
  timecode: number;
  effects: Partial<ClipEffects>;
  text_overlays?: TextOverlay[];
  lut_path?: string;
}

export async function getPreviewFrame(params: PreviewFrameParams): Promise<string> {
  const res = await client.post('/effects/preview-frame', {
    clip_path: params.clip_path,
    timecode: params.timecode,
    brightness: params.effects.brightness ?? 0,
    contrast: params.effects.contrast ?? 0,
    saturation: params.effects.saturation ?? 0,
    hue: params.effects.hue ?? 0,
    blur: params.effects.blur ?? 0,
    sharpen: params.effects.sharpen ?? 0,
    lut_path: params.lut_path ?? params.effects.lutPath,
    text_overlays: params.text_overlays ?? [],
  });
  return res.data.frame;
}

export async function listLuts(): Promise<string[]> {
  const res = await client.get('/effects/luts');
  return res.data.luts;
}
