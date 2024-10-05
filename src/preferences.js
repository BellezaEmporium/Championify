import Promise from 'bluebird';
import path from 'path';
import semver from 'semver';

import ChampionifyErrors from './errors.js';
import Log from './logger.js';
import pathManager from './path_manager.js';
import store from './store.js';
import T from './translate.js';

const fs = Promise.promisifyAll(require('fs-extra'));
import pkg from "../package.json" with { type: "json" };

class Preferences {
  /**
   * Get preference directory
   * @returns {String} Preference directory path
   */
  directory() {
    let preference_dir;
    if (process.platform === 'darwin') {
      preference_dir = path.join(process.env.HOME, 'Library/Application Support/Championify/');
    } else {
      preference_dir = path.join(process.env.APPDATA, 'Championify');
    }
    return preference_dir;
  }

  /**
   * Get preference file path
   * @returns {String} Preference file path
   */
  file() {
    return path.join(this.directory(), 'prefs.json');
  }

  /**
   * Gets preferences file
   * @returns {String|Null} JSON object of preferences, or null
   */
  load() {
    const preference_file = this.file();
    if (fs.existsSync(preference_file)) {
      let prefs = {};
      const rawprefs = fs.readFileSync(preference_file);
      try {
        prefs = JSON.parse(rawprefs);
      } catch (err) {
        Log.warn('Unable to parse preferences');
        Log.warn(rawprefs);
        Log.warn(err);
      }

      if (!prefs.prefs_version || semver.lt(prefs.prefs_version, '1.3.3')) return null;
      return prefs;
    }

    return null;
  }

  /**
   * Applies preferences to UI
   * @param {Object} Preferences object
   */
  set(preferences) {
    if (!preferences) return pathManager.findInstallPath();

    document.getElementById('local_version').textContent = preferences.local_is_version || T.t('unknown');
    pathManager.checkInstallPath(preferences.install_path, function(err) {
      if (err) {
        pathManager.findInstallPath();
      } else {
        pathManager.checkInstallPath(preferences.install_path, pathManager.setInstallPath);
      }
    });

    Object.entries(preferences.options).forEach(([key, val]) => {
      if (key.indexOf('position') > -1) {
        const element = document.querySelector(`#options_${key} .${val}`);
        if (element) {
          element.classList.add('active', 'selected');
        }
      } else {
        const element = document.getElementById(`options_${key}`);
        if (element) {
          element.checked = val;
        }
      }
    });
  }

  /**
   * Gets all preferences from UI
   * @returns {Object} Preferences object
   */
  get() {
    const consumables_position = document.querySelector('#options_consumables_position .beginning').classList.contains('selected') ? 'beginning' : 'end';
    const trinkets_position = document.querySelector('#options_trinkets_position .beginning').classList.contains('selected') ? 'beginning' : 'end';
    return {
      prefs_version: pkg.version,
      locale: T.locale,
      install_path: store.get('lol_install_path'),
      champ_path: store.get('lol_champ_path'),
      local_is_version: document.getElementById('local_version').textContent,
      options: {
        splititems: document.getElementById('options_splititems').checked,
        skillsformat: document.getElementById('options_skillsformat').checked,
        consumables: document.getElementById('options_consumables').checked,
        consumables_position: consumables_position,
        trinkets: document.getElementById('options_trinkets').checked,
        trinkets_position: trinkets_position,
        locksr: document.getElementById('options_locksr').checked,
        sr_source: document.getElementById('options_sr_source').value.split(','),
        dontdeleteold: document.getElementById('options_dontdeleteold').checked,
        aram: document.getElementById('options_aram').checked
      }
    };
  }

  /**
   * Saves preference file
   * @param {Object} [this.get()] Preferences object
   * @returns {Promise}
   */
  save(preferences) {
    preferences = preferences || this.get();
    if (!preferences) throw new ChampionifyErrors.OperationalError('Preferences object does not exist');
    const preference_file = this.file();
    fs.mkdirsSync(this.directory());
    return fs.writeFileAsync(preference_file, JSON.stringify(preferences, null, 2), 'utf8')
      .tap(() => Log.info(`Saved preference file to ${preference_file}`))
      .catch(err => Log.error(err));
  }
}

const prefs = new Preferences();
export default prefs;
