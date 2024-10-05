import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import viewManager from './view_manager.js'
import winston from 'winston'

// Configure logging
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'

// Disable auto downloading of updates
autoUpdater.autoDownload = false

export function checkForUpdates () {
  autoUpdater.checkForUpdates()
}

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...')
})

autoUpdater.on('update-available', () => {
  log.info('Update available')
  viewManager.update()
  autoUpdater.downloadUpdate()
})

autoUpdater.on('update-not-available', () => {
  log.info('Update not available')
})

autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater. ', err)
  viewManager.error()
})

autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `Download speed: ${progressObj.bytesPerSecond}`
  logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`
  logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`
  winston.info(logMessage)
  // Update your UI here, e.g.:
  viewManager.updateProgress(progressObj.percent)
})

autoUpdater.on('update-downloaded', () => {
  winston.info('Update downloaded')
  autoUpdater.quitAndInstall()
})

export default function update () {
  if (process.env.NODE_ENV === 'development') {
    winston.info('Skipping update check in development mode')
    return Promise.resolve(false)
  }

  winston.info('Checking for updates')
  return new Promise((resolve, reject) => {
    autoUpdater.on('update-not-available', () => resolve(false))
    autoUpdater.on('error', reject)
    autoUpdater.on('update-available', () => resolve(true))
    checkForUpdates()
  })
}

export function initAutoUpdater () {
  if (app.isReady()) {
    checkForUpdates()
  } else {
    app.on('ready', checkForUpdates)
  }
}
