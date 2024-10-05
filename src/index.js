// Electron
import { ipcRenderer } from 'electron';

import Promise from 'bluebird';
import { exec } from 'child_process';
import open from 'open';
import path from 'path';

import championify from './championify.js';
import { EndSession } from './helpers/index.js';
import Log from './logger.js';
import optionsParser from './options_parser.js';
import preferences from './preferences.js';
import pathManager from './path_manager.js';
import pkg from '../package.json' with { type: "json" };
import store from './store.js';
import T from './translate.js';
import update from './update.js';
import viewManager from './view_manager.js';

// Debugging helpers
window.viewManager = viewManager;
window.preferences = preferences;
window.optionsParser = optionsParser;

const loadedPrefs = preferences.load();
if (loadedPrefs && loadedPrefs.locale !== 'en') T.loadPhrases(loadedPrefs.locale);

Log.info('Version: ' + pkg.version);

/**
 * Add system buttons
 */

if (process.platform === 'darwin') {
  document.querySelectorAll('.osx_buttons').forEach(el => el.classList.remove('hidden'));
} else {
  document.querySelectorAll('.win_buttons').forEach(el => el.classList.remove('hidden'));
}

/**
 * Function to call Electrons OpenDialog. Sets title based on Platform.
 */

let folder_dialog_open = false;
function openFolder() {
  if (!folder_dialog_open) {
    folder_dialog_open = true;
    let properties = ['openFile'];
    if (process.platform === 'win32') properties = ['openDirectory'];

    return dialog.showOpenDialog({
      properties,
      title: store.get('browse_title')
    }, selected_path => {
      folder_dialog_open = false;
      if (selected_path) return pathManager.checkInstallPath(selected_path, pathManager.setInstallPath);
    });
  }
}

/**
 * Warn user if their league folder isn't selected.
 */

function selectFolderWarning() {
  const inputMsg = document.getElementById('input_msg');
  inputMsg.classList.add('yellow');
  inputMsg.textContent = T.t('select_folder');
  inputMsg.classList.add('shake');
  setTimeout(() => inputMsg.classList.remove('shake'), 1000); // Assuming shake animation lasts 1 second
}

/**
 * Checks league path and imports item sets
 * @returns {Promise}
 */

function importItemSets() {
  if (!store.get('lol_install_path')) {
    selectFolderWarning();
    return Promise.resolve(false);
  }

  let fadeup = false;
  if (!championify.verifySettings()) return Promise.resolve(false);
  document.getElementById('btns_versions').classList.add('hidden');

  document.querySelectorAll('.optionsrow').forEach(el => {
    el.classList.add('fade-down');
    setTimeout(() => {
      if (!fadeup) {
        fadeup = true;
        document.getElementById('process_log').classList.add('fade-up');
      }
    }, 300);
  });

  return championify.run()
    .then(completed => viewManager.complete())
    .catch(EndSession);
}

/**
 * Checks and deletes item sets
 */

function deleteItemSets() {
  if (!store.get('lol_install_path')) {
    selectFolderWarning();
  } else {
    const deleteNotification = document.getElementById('delete_notification');
    deleteNotification.classList.add('show');
    championify['delete'](true).then(() => {
      deleteNotification.querySelector('#progress-icon').innerHTML = '<i class="check icon" />';
    });
  }
}

/**
 * Start the League of Legends client.
 */

function startLeague() {
  const exit = function() {
    return setTimeout(() => app.quit(), 500);
  };
  if (process.platform === 'darwin') {
    exec(`open -n "${store.get('lol_install_path')}"`);
    exit();
  } else if (store.get('lol_executable')) {
    exec(`"${path.join(store.get('lol_install_path'), store.get('lol_executable'))}"`);
    exit();
  } else {
    Log.error(`League of legends executable is not defined. ${store.get('lol_executable')}`);
    const startLeagueBtn = document.getElementById('start_league');
    startLeagueBtn.className = 'ui inverted red button';
    startLeagueBtn.textContent = 'Can\'t start League';
  }
}

/**
 * Goes through options parameters and acts.
 */

function executeOptionParameters() {
  if (optionsParser['delete']()) {
    deleteItemSets();
  } else if (optionsParser['import']() || optionsParser.autorun()) {
    return importItemSets().then(completed => {
      if (optionsParser.close() || optionsParser.autorun()) return app.quit();
      if (completed && optionsParser.startLeague()) startLeague();
    });
  }
}

/**
 * Init view, check for updates, parse options parameters
 */

viewManager.init()
  .then(update)
  .then(is_update => {
    if (is_update === false) return executeOptionParameters();
  })
  .catch(EndSession);

/**
 * Watches for buttons pressed on UI.
 */

document.getElementById('browse').addEventListener('click', openFolder);

document.querySelector('.github > a').addEventListener('click', function(e) {
  e.preventDefault();
  open('https://github.com/BellezaEmporium/Championify#championify');
});

document.querySelector('.championify_version > span').addEventListener('click', function(e) {
  e.preventDefault();
  open('https://github.com/BellezaEmporium/Championify/releases/latest');
});

document.getElementById('open_log').addEventListener('click', function(e) {
  e.preventDefault();
  const log_path = path.join(preferences.directory(), 'championify.log.txt');
  if (process.platform === 'win32') {
    exec(`start notepad ${log_path}`);
  } else {
    open(log_path);
  }
});

document.getElementById('import_btn').addEventListener('click', importItemSets);

document.getElementById('delete_btn').addEventListener('click', deleteItemSets);

document.getElementById('install_path').addEventListener('input', function() {
  pathManager.checkInstallPath(this.value, pathManager.setInstallPath);
});

document.querySelector('.sys_button.minimize').addEventListener('click', function(e) {
  e.preventDefault();
  ipcRenderer.send('minimize-window');
});

document.querySelector('.sys_button.close').addEventListener('click', function(e) {
  e.preventDefault();
  app.quit();
});

document.getElementById('start_league').addEventListener('click', startLeague);

document.getElementById('back_to_main').addEventListener('click', viewManager.mainBack);

document.getElementById('release_button').addEventListener('click', function() {
  open('https://github.com/BellezaEmporium/Championify/releases/latest');
});
