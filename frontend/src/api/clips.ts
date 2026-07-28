import client from './client';
import { MediaFile } from '../types/editor';

export async function importClips(paths: string[]): Promise<MediaFile[]> {
  const res = await client.post('/clips/import', { paths });
  return res.data;
}

export function getThumbnailUrl(mediaId: string): string {
  return `http://localhost:8000/clips/${mediaId}/thumbnail`;
}

export function getWaveformUrl(mediaId: string): string {
  return `http://localhost:8000/clips/${mediaId}/waveform`;
}

export function getFileUrl(path: string): string {
  return `http://localhost:8000/files?path=${encodeURIComponent(path)}`;
}
