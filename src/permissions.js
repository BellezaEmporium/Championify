import Promise from 'bluebird'
import { exec } from 'child_process'
import { glob } from 'glob'
import path from 'path'

import ChampionifyErrors from './errors.js'
import optionsParser from './options_parser.js'
import preferences from './preferences.js'
import store from './store.js'

const fs = Promise.promisifyAll(require('fs-extra'))

/**
 * If platform is Windows, check if we can write to the user selected directory, and restart as admin if not.
 * @returns {Promise}
 */

function championTest () {
  const itemset_path = store.get('itemset_path')
  if (process.platform === 'win32' && !optionsParser.runnedAsAdmin()) {
    return Promise.resolve()
      .then(() => {
        if (!fs.existsSync(itemset_path)) return fs.mkdirsAsync(itemset_path)
      })
      .then(() => fs.mkdirsAsync(path.join(itemset_path, 'testme')))
      .then(() => fs.mkdirsAsync(path.join(itemset_path, 'testme/test.txt')))
      .then(() => {
        const champ_files = glob.sync(path.join(itemset_path, '**/*.json'))
        if (champ_files && champ_files[0]) return fs.removeAsync(champ_files[0])
      })
      .then(() => {
        const champ_files = glob.sync(path.join(itemset_path, '**/*.json'))
        if (champ_files && champ_files[0]) {
          const data = fs.readFileSync(champ_files[0], 'utf8')
          return fs.writeFileAsync(champ_files[0], data, 'utf8')
        }
      })
      .then(() => fs.removeAsync(path.join(itemset_path, 'testme')))
      .catch(err => {
        throw new ChampionifyErrors.FileWriteError('Permissions test failed').causedBy(err)
      })
  }

  return Promise.resolve()
}

/**
 * Sets permissions of all champion json files so we can write
 * @param {Array} files
 * @returns {Promise}
 */

function setWindowsPermissions (files) {
  const cmds = files.map(f => `ICACLS "${f}" /grant Users:F`)
  cmds.push('exit')
  const permissions_file = path.join(preferences.directory(), 'set_permission.bat')

  return fs.writeFileAsync(permissions_file, cmds.join('\n'), 'utf8')
    .then(() => {
      return new Promise((resolve, reject) => {
        exec(`START "" "${permissions_file}"`, function (err, stdout, stderr) {
          if (err) return reject(err)
          return resolve()
        })
      })
    })
    .catch(err => {
      throw new ChampionifyErrors.FileWriteError('Can\'t write set_permission.bat').causedBy(err)
    })
}

export default {
  championTest,
  setWindowsPermissions
}
