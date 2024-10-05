import fs from 'fs'
import { glob } from 'glob'
import path from 'path'
import store from './store.js'
import T from './translate.js'

/**
 * Finds league installation on OSX and Windows.
 */
function findInstallPath () {
  const user_home = process.env.HOME || process.env.USERPROFILE
  if (process.platform === 'darwin') {
    if (fs.existsSync('/Applications/League of Legends.app')) {
      return this.setInstallPath(null, '/Applications/League of Legends.app/', 'Contents/LoL/Config/Champions/')
    } else if (fs.existsSync(`${user_home}/Applications/League of Legends.app`)) {
      return this.setInstallPath(null, `${user_home}/Applications/League of Legends.app/`, 'Contents/LoL/Config/Champions/')
    }
  } else if (fs.existsSync('C:/Riot Games/League Of Legends/LeagueClient.exe')) {
    return this.setInstallPath(null, 'C:/Riot Games/League Of Legends/', 'Config/Champions/', 'LeagueClient.exe')
  } else if (fs.existsSync('C:/Riot Games/League Of Legends/lol.launcher.exe')) {
    return this.setInstallPath(null, 'C:/Riot Games/League Of Legends/', 'Config/Champions/', 'lol.launcher.exe')
  }
}

/**
 * Function Verifies the users selected install paths. Warns if no League related files/directories are found.
 * @param {String} selected_path - User selected path
 * @param {Function} done - Callback function
 */
function checkInstallPath (selected_path, done) {
  if (selected_path && typeof selected_path !== 'string') selected_path = selected_path[0]

  try {
    fs.lstatSync(selected_path)
  } catch (_error) {
    const inputMsg = document.getElementById('input_msg')
    inputMsg.classList.add('red')
    inputMsg.textContent = T.t('invalid_path')
    return
  }

  const pathsToCheck = [
    { path: 'Contents/LoL/', platform: 'darwin', champPath: 'Contents/LoL/Config/Champions/' },
    { path: 'League of Legends.app', platform: 'darwin', champPath: 'Contents/LoL/Config/Champions/' },
    { path: 'lol.launcher.exe', platform: 'win32', champPath: 'Config/Champions/' },
    { path: 'LeagueClient.exe', platform: 'win32', champPath: 'Config/Champions/' },
    { path: 'lolex.exe', platform: 'win32', champPath: 'Game/Config/Champions/' },
  ]

  for (const { path: checkPath, platform, champPath } of pathsToCheck) {
    if (process.platform === platform && fs.existsSync(path.join(selected_path, checkPath))) {
      return done(null, selected_path, champPath, path.basename(checkPath))
    }
  }

  if (process.platform === 'win32') {
    const garenaCheck = glob.sync(path.join(selected_path, 'LoL*Launcher.exe'))[0]
    if (garenaCheck) {
      const garenaVersion = path.basename(glob.sync(path.join(selected_path, 'GameData/Apps/*'))[0])
      return done(null, selected_path, `GameData/Apps/${garenaVersion}/Game/Config/Champions/`, path.basename(garenaCheck))
    }
  }

  done(new Error('Path not found'), selected_path)
}

/**
 * Sets the path string for the user to see on the interface.
 * @param {String} Path error. If false explains path error
 * @param {String} Installation path
 * @param {String} Champion folder path relative to Install Path
 * @param {String} Path to league executable
 */
function setInstallPath (path_err, install_path, champ_path, executable) {
  const inputMsg = document.getElementById('input_msg')
  const importBtn = document.getElementById('import_btn')
  const deleteBtn = document.getElementById('delete_btn')

  function enableBtns () {
    importBtn.classList.remove('disabled')
    deleteBtn.classList.remove('disabled')
  }

  function pathErr () {
    inputMsg.classList.add('yellow')
    inputMsg.textContent = T.t('sure_thats_league')
    enableBtns()
  }

  function foundLeague () {
    inputMsg.classList.add('green')
    inputMsg.textContent = `${T.t('found')} League of Legends!`
    enableBtns()
  }

  inputMsg.removeAttribute('class')
  inputMsg.textContent = ''

  if (!champ_path) {
    champ_path = process.platform === 'darwin' ? 'Contents/LoL/Config/Champions/' : 'Config/Champions/'
  }

  store.set('lol_install_path', install_path)
  store.set('lol_champ_path', champ_path)
  store.set('lol_executable', executable)
  store.set('itemset_path', path.join(install_path, champ_path))
  document.getElementById('install_path').value = install_path

  if (path_err) return pathErr()
  foundLeague()
}

export default {
  findInstallPath,
  checkInstallPath,
  setInstallPath
}
