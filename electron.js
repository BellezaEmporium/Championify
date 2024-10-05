import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import initAutoUpdater from './src/update.js'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = process.env.NODE_ENV === 'development'
let mainWindow = null

function createWindow () {
  mainWindow = new BrowserWindow({
    fullscreen: false,
    width: 450,
    height: 670,
    center: true,
    resizable: false,
    show: false,
    frame: false,
    title: 'Championify',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '.webpack/renderer', 'index.html'))
  };

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  };
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  };
})

// IPC handlers
ipcMain.handle('show-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
  })
  return result
})

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize()
  };
})

ipcMain.handle('elevate', (event, params) => {
  if (process.platform !== 'win32') {
    throw new Error('Elevation is only implemented for Windows')
  }

  const browserWindow = BrowserWindow.fromId(event.sender.id)

  browserWindow.hide()

  const command = `powershell -Command "Start-Process '${process.execPath}' -ArgumentList '--runned-as-admin ${params.join(' ')}' -Verb RunAs"`

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        browserWindow.show()
        return reject(new Error(`Failed to elevate permissions: ${stderr}`))
      }
      app.quit()
    })
  })
})

ipcMain.on('update-progress', (event, progress) => {
  const browserWindow = BrowserWindow.fromId(event.sender.id)

  if (progress >= 100) {
    browserWindow.setProgressBar(-1) // Indeterminate state
  } else {
    browserWindow.setProgressBar(progress / 100) // Set the progress value
  }
})

app.whenReady().then(() => {
  initAutoUpdater()
  createWindow()
})
