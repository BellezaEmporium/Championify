import Index from './components/index.marko'
import './styles/index.scss'

Index.renderSync({})
  .appendTo(document.body)

// Example to minimize the window
async function minimizeWindow () {
  try {
    await window.api.invoke('minimize-window')
  } catch (error) {
    console.error('Error minimizing window:', error)
  }
}

// Example to show dialog
async function showDialog () {
  try {
    await window.api.invoke('show-dialog')
  } catch (error) {
    console.error('Error showing dialog:', error)
  }
}

async function elevate (params = []) {
  try {
    await window.api.invoke('elevate', params)
  } catch (error) {
    console.error('Error elevating permissions:', error)
  }
}

// Update progress bar based on messages from the main process
async function updateProgress (progress) {
  await window.api.send('update-progress', progress)
}
