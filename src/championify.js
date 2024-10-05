import Promise from 'bluebird'
import { glob } from 'glob'
import path from 'path'

import { cl, elevate, request, spliceVersion } from './helpers/index.js'

import ChampionifyErrors from './errors.js'
import Log from './logger.js'
import optionsParser from './options_parser.js'
import preferences from './preferences.js'
import permissions from './permissions.js'
import progressbar from './progressbar.js'
import store from './store.js'
import sources from './sources/index.js'
import T from './translate.js'

const fs = Promise.promisifyAll(require('fs-extra'))

/**
 * Saves settings/options from the frontend.
 * @returns {Promise}
*/
function saveSettings () {
  return preferences.save()
}

/**
 * Gets the latest Riot Version.
 * @returns {Promise.<String| ChampionifyErrors.RequestError>} Riot version.
*/
function getRiotVer () {
  if (store.get('importing')) cl(`${T.t('lol_version')}`)
  return request({ url: 'https://ddragon.leagueoflegends.com/realms/na.json', json: true })
    .then(response => response.v)
    .then(version => {
      store.set('riot_ver', version)
      return version
    })
    .catch(err => {
      throw new ChampionifyErrors.RequestError('Can\'t get Riot Version').causedBy(err)
    })
}

/**
 * Downloads all available champs from Riot.
 * @returns {Promise.<Array|ChampionifyErrors.RequestError>} Array of Champions in Riot's data schema.
*/
function getChamps () {
  cl(`${T.t('downloading_champs')}`)
  const params = {
    url: `http://ddragon.leagueoflegends.com/cdn/${store.get('riot_ver')}/data/${T.riotLocale()}/champion.json`,
    json: true
  }

  return request(params)
    .then(response => response.data)
    .then(data => {
      if (!data) throw new ChampionifyErrors.RequestError('Can\'t get Champs')

      let translations = Object.keys(data).reduce((acc, key) => {
        acc[key] = data[key].name
        return acc
      }, {})

      translations = Object.keys(translations).reduce((acc, key) => {
        acc[key.toLowerCase().replace(/ /g, '')] = translations[key]
        return acc
      }, {})

      translations.wukong = translations.monkeyking
      T.merge(translations)

      const champ_ids = Object.values(data).reduce((acc, champ_data) => {
        acc[champ_data.id.toLowerCase()] = champ_data.key
        return acc
      }, {})

      store.set('champs', Object.keys(data).sort())
      store.set('champ_ids', champ_ids)
    })
    .catch(err => {
      if (err instanceof ChampionifyErrors.ChampionifyError) throw err
      throw new ChampionifyErrors.RequestError('Can\'t get Champs').causedBy(err)
    })
}

// TODO: Write tests and docs
function getSpecialItems () {
  if (store.get('special_items')) return Promise.resolve(store.get('special_items'))
  const params = {
    url: `http://ddragon.leagueoflegends.com/cdn/${store.get('riot_ver')}/data/en_US/item.json`,
    json: true
  }

  return request(params)
    .then(response => response.data)
    .then(items => {
      return Object.keys(items).map(id => {
        const data = items[id]
        if (data.specialRecipe) return [id, String(data.specialRecipe)]
        if (data.requiredAlly) return [id, data.from[0]]
      }).filter(Boolean)
    })
    .then(pairs => Object.fromEntries(pairs))
    .then(items => {
      store.set('special_items', items)
      return items
    })
}

/**
 * Deletes all previous Championify builds from client.
 * @param {Boolean} [false]
 * @returns {Promise}
 */

function deleteOldBuilds (deletebtn) {
  if (store.get('settings') && store.get('settings').dontdeleteold) return Promise.resolve()

  cl(T.t('deleting_old_builds'))
  const globbed = [
    glob.sync(`${store.get('itemset_path')}**/CGG_*.json`),
    glob.sync(`${store.get('itemset_path')}**/CIFY_*.json`)
  ]

  const filesToDelete = [].concat(...globbed)

  return Promise.resolve(filesToDelete)
    .then(files => Promise.all(files.map(f => fs.unlinkAsync(f))))
    .catch(err => Log.warn(err))
    .then(() => {
      if (deletebtn !== true) progressbar.incr(2.5)
    })
}

/**
 * Fixes common issues between sources generated item sets, then saves all compiled item sets to file, creating paths included.
 * @returns {Promise}
 */

function fixAndSaveToFile () {
  const special_items = store.get('special_items')

  return Promise.resolve([store.get('sr_itemsets'), store.get('aram_itemsets')])
    .then(itemsets => itemsets.flat())
    .then(itemsets => itemsets.filter(itemset => itemset !== null && itemset !== undefined))
    .then(itemsets => {
      return Promise.all(itemsets.map(data => {
        const champ = data.champ.toLowerCase() === 'wukong' ? 'monkeyking' : data.champ

        // Replaces special items that are not available in store. (e.g. Ornn items)
        data.riot_json.blocks.forEach(block => {
          block.items = block.items.map(item => {
            if (special_items[item.id]) item.id = special_items[item.id]
            return item
          })
        })

        const itemset_data = JSON.stringify(data.riot_json, null, 4)
        const folder_path = path.join(store.get('itemset_path'), champ, 'Recommended')
        const file_path = path.join(folder_path, `CIFY_${champ}_${data.source}_${data.file_prefix}.json`)

        return fs.mkdirsAsync(folder_path)
          .catch(err => Log.warn(err))
          .then(() => fs.writeFileAsync(file_path, itemset_data, 'utf8'))
          .catch(err => {
            throw new ChampionifyErrors.FileWriteError('Failed to write item set json file').causedBy(err)
          })
      }))
    })
}

/**
 * Resave preferences with new local version
 * @returns {Promise}
 */

function resavePreferences () {
  const prefs = preferences.get()
  prefs.local_is_version = spliceVersion(store.get('riot_ver'))
  return preferences.save(prefs)
}

/**
 * Set windows permissions if required
 * @returns {Promise}
 */

function setWindowsPermissions () {
  if (process.platform === 'win32' && optionsParser.runnedAsAdmin()) {
    cl(T.t('resetting_file_permission'))
    const champ_files = glob.sync(path.join(store.get('itemset_path'), '**'))
    return permissions.setWindowsPermissions(champ_files)
  }
}

/**
 * Verifies requires settings in order to importer.
 * @returns {Boolean}
 */

function verifySettings () {
  store.set('settings', preferences.get().options)
  const srSource = store.get('settings').sr_source.filter(Boolean)
  if (!srSource.length) {
    document.querySelectorAll('.rift_source').forEach(element => {
      element.classList.add('jiggle')
    })
    return false
  }

  return true
}

/**
 * Main function that starts up all the magic.
 * @returns {Promise}
 */

async function downloadItemSets () {
  try {
    store.set('importing', true)
    store.remove('sr_itemsets')
    store.remove('aram_itemsets')
    store.remove('undefined_builds')
    progressbar.reset()

    const toProcess = []
    if (store.get('settings').aram) {
      toProcess.push({ name: 'lolflavor', method: sources.lolflavor.getAram })
    }

    store.get('settings').sr_source
      .filter(Boolean)
      .forEach(source => {
        if (sources[source]) {
          toProcess.push({ name: source, method: sources[source].getSr })
        }
      })

    Log.info(`Locale: ${T.locale}`)

    await saveSettings()
    await getRiotVer()
    await getChamps()
    await getSpecialItems()

    await Promise.all(toProcess.map(async (source) => {
      try {
        await source.method()
      } catch (err) {
        Log.error(err)
        store.push('undefined_builds', {
          champ: 'All',
          position: 'All',
          source: source.name
        })
      }
    }))

    await deleteOldBuilds()
    await fixAndSaveToFile()
    await resavePreferences()
    await setWindowsPermissions()

    store.set('importing', false)
    progressbar.incr(100)
    return true
  } catch (err) {
    if (err instanceof ChampionifyErrors.FileWriteError && process.platform === 'win32') {
      Log.error(err)
      return elevate(['--import'])
    }
    throw err
  }
}

/**
 * Export.
 */
export default {
  run: downloadItemSets,
  delete: deleteOldBuilds,
  getVersion: getRiotVer,
  getSpecialItems,
  verifySettings
}
