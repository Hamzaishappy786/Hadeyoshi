import client from './client';
import { SubtitleEntry } from '../types/editor';
import { v4 as uuidv4 } from 'uuid';

export async function transcribeClip(clipPath: string): Promise<SubtitleEntry[]> {
  const res = await client.post('/ai/transcribe', { clip_path: clipPath }, { timeout: 300000 });
  return res.data.segments.map((s: { start: number; end: number; text: string }) => ({
    id: uuidv4(),
    startTime: s.start,
    endTime: s.end,
    text: s.text,
  }));
}

export async function detectScenes(clipPath: string): Promise<number[]> {
  const res = await client.post('/ai/scene-detect', { clip_path: clipPath }, { timeout: 120000 });
  return res.data.timestamps;
}

export async function removeSilence(clipPath: string): Promise<Array<{ start: number; end: number }>> {
  const res = await client.post('/ai/remove-silence', { clip_path: clipPath });
  return res.data.silences;
}
