const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { startBackend, stopBackend, waitForBackend } = require('./utils/processManager');

let mainWindow = null;
const isDev = process.env.NODE_ENV !== 'production';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0e0e0f',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1b',
      symbolColor: '#f0f0f0',
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    // In dev, Vite is already running from npm start — just load it
    mainWindow.loadURL('http://localhost:5173');
    // Uncomment to open devtools: mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

ipcMain.handle('dialog:openFile', async (_, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('shell:openPath', async (_, filePath) => {
  return shell.openPath(filePath);
});

ipcMain.handle('fs:writeFile', async (_, filePath, data) => {
  const fs = require('fs');
  fs.writeFileSync(filePath, data, 'utf-8');
  return { ok: true };
});

ipcMain.handle('fs:readFile', async (_, filePath) => {
  const fs = require('fs');
  return fs.readFileSync(filePath, 'utf-8');
});

// Projects folder — ~/Documents/VideoEditorProjects
function getProjectsDir() {
  return path.join(app.getPath('documents'), 'VideoEditorProjects');
}

ipcMain.handle('fs:getProjectsDir', () => getProjectsDir());

ipcMain.handle('fs:listProjects', () => {
  const fs = require('fs');
  const dir = getProjectsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.vedit.json'))
    .map(f => {
      const filePath = path.join(dir, f);
      const stat = fs.statSync(filePath);
      return { name: f.replace(/\.vedit\.json$/, ''), path: filePath, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
});

ipcMain.handle('fs:saveProjectAuto', async (_, projectName, data) => {
  const fs = require('fs');
  const dir = getProjectsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safe = projectName.replace(/[\\/:*?"<>|]/g, '_') || 'Untitled';
  const filePath = path.join(dir, `${safe}.vedit.json`);
  fs.writeFileSync(filePath, data, 'utf-8');
  return { filePath };
});

app.whenReady().then(async () => {
  if (!isDev) {
    // Production: Electron is the only process — spawn everything
    startBackend();
  }

  // Either way, wait for the backend to be reachable
  const ready = await waitForBackend('http://localhost:8000/health', 30000);
  if (!ready) {
    console.error('[Main] Backend did not start in time.');
  } else {
    console.log('[Main] Backend is ready.');
  }

  await createWindow();
});

app.on('before-quit', () => {
  if (!isDev) stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!isDev) stopBackend();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
