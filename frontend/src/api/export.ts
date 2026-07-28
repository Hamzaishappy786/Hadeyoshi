import client from './client';
import { ExportSettings, Project } from '../types/editor';

export async function startExport(project: Project, settings: ExportSettings): Promise<string> {
  const res = await client.post('/export/render', { project, settings });
  return res.data.job_id;
}

export async function cancelExport(jobId: string): Promise<void> {
  await client.post(`/export/cancel/${jobId}`);
}

export function createProgressStream(
  jobId: string,
  onProgress: (data: { progress: number; fps: number; eta: string; status: string }) => void,
  onDone: () => void,
  onError: (err: string) => void,
): EventSource {
  const es = new EventSource(`http://localhost:8000/export/progress/${jobId}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onProgress(data);
      if (data.status === 'done') {
        es.close();
        onDone();
      } else if (data.status === 'error') {
        es.close();
        onError(data.error ?? 'Export failed');
      }
    } catch {
      // ignore parse errors
    }
  };
  es.onerror = () => {
    es.close();
    onError('Connection to export stream lost');
  };
  return es;
}
