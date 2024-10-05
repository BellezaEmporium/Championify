import { ipcRenderer } from 'electron'
import store from './store.js'

class ProgressBar {
  constructor () {
    this.percentage = 0
  }

  reset () {
    this.percentage = 0
  }

  incrUI (id, incr = this.percentage) {
    let floored = Math.floor(incr)
    if (floored > 100) floored = 100

    const element = document.getElementById(id)
    if (element) {
      element.setAttribute('data-percent', floored)
      const bar = element.querySelector('.bar')
      if (bar) {
        bar.style.width = `${floored}%`
      }
      const progress = element.querySelector('.progress')
      if (progress) {
        progress.textContent = `${floored}%`
      }
    }
  }

  incr (incr) {
    if (process.env.NODE_ENV === 'test') return

    this.percentage += incr
    this.incrUI('itemsets_progress_bar', this.percentage)

    // Send progress update to the main process
    ipcRenderer.send('update-progress', this.percentage)
  }

  incrChamp (divisible = 1) {
    if (process.env.NODE_ENV === 'test') return

    const settings = store.get('settings')
    const champs = store.get('champs').length
    let sources = settings.sr_source.length
    if (settings.aram) sources++

    this.incr(100 / champs / sources / divisible)
  }
}

const progressbar = new ProgressBar()
export default progressbar
