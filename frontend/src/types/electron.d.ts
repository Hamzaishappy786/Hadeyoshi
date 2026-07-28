export {};

declare global {
  interface Window {
    electronAPI?: {
      openFile:        (options: object) => Promise<{ canceled: boolean; filePaths: string[] }>;
      saveFile:        (options: object) => Promise<{ canceled: boolean; filePath?: string }>;
      openPath:        (filePath: string) => Promise<void>;
      writeFile:       (filePath: string, data: string) => Promise<{ ok: boolean }>;
      readFile:        (filePath: string) => Promise<string>;
      getProjectsDir:  () => Promise<string>;
      listProjects:    () => Promise<Array<{ name: string; path: string; mtime: number }>>;
      saveProjectAuto: (name: string, data: string) => Promise<{ filePath: string }>;
    };
  }
}
