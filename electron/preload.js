const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile:       (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile:       (options) => ipcRenderer.invoke('dialog:saveFile', options),
  openPath:       (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  writeFile:      (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  readFile:       (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  getProjectsDir: () => ipcRenderer.invoke('fs:getProjectsDir'),
  listProjects:   () => ipcRenderer.invoke('fs:listProjects'),
  saveProjectAuto:(name, data) => ipcRenderer.invoke('fs:saveProjectAuto', name, data),
});
