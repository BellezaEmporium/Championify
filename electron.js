const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const R = require('ramda');

// Used for Squirrel install on Windows
if (require('electron-squirrel-startup')) app.quit();

const devEnabled = process.env.NODE_ENV === 'development' ||
  fs.existsSync(path.resolve(__dirname, 'dev_enabled')) ||
  fs.existsSync(path.join(__dirname, '..', 'dev_enabled'));

let mainWindow = null;

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
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
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`file://${path.join(__dirname, 'index.html')}`);
  
  if (devEnabled) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (!R.contains('--autorun', process.argv)) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});
