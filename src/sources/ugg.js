import Promise from 'bluebird'
import { DateTime } from 'luxon'
import ChampionifyErrors from '../errors'
import { cl, request, spliceVersion, trinksCon } from '../helpers'
import Log from '../logger'
import progressbar from '../progressbar'
import store from '../store'
import T from '../translate'
import { json } from 'express'

export const source_info = {
  name: 'U.gg',
  id: 'ugg'
}

/**
 * Constants fallbacks.
 */
const UGG_VERSION = '1.5.0'
const UGG_CONSTANT = '1.5'

function getUggVersion () {
  return request({ url: 'https://static.bigbrain.gg/assets/lol/riot_patch_update/prod/ugg/ugg-api-versions.json', json: true })
    .then(body => {
      if (!body || !body.versions) throw new ChampionifyErrors.MissingData('U.gg: Versions')
      return body.versions[0].builds
    })
    .catch(err => {
      Log.warn(err)
      return UGG_VERSION
    })
}

function _getItems (champ, mode) {
  const riot_items = store.get('item_names')
  return request.get(`https://u.gg/lol/champions/${mode}/${champ.toLowerCase()}-${mode}-build/`)
    .then(cheerio.load)
    .then($c => {
      // Starter Items
      const starter_items = []
      $c('.starter .item').each((idx, elem) => {
        const item_name = $c(elem).attr('alt')
        starter_items.push(riot_items[item_name])
      })

      // Core Items
      const core_items = []
      $c('.core .item').each((idx, elem) => {
        const item_name = $c(elem).attr('alt')
        core_items.push(riot_items[item_name])
      })

      // End Items
      const end_items = []
      $c('.end .item').each((idx, elem) => {
        const item_name = $c(elem).attr('alt')
        end_items.push(riot_items[item_name])
      })

      // Boots
      const boots = []
      $c('.boots .item').each((idx, elem) => {
        const item_name = $c(elem).attr('alt')
        boots.push(riot_items[item_name])
      })

      return {
        starter_items,
        core_items,
        end_items,
        boots
      }
    })
}

function _requestAvailableChamps (process_name, stats_file) {
  return request({ url: `https://stats2.u.gg/lol/1.5/overview/world/${getVersion()}/ranked_solo_5x5/emerald_plus/1.5.0.json${stats_file}`, json: true })
    .then(body => {
      if (!body.champions) throw new ChampionifyErrors.MissingData(`U.gg: ${process_name}`)
      return body.champions.map(champ => champ.name).sort()
    })
    .catch(err => {
      Log.warn(err)
      store.push('undefined_builds', {
        source: source_info.name,
        champ: T.t(process_name),
        position: 'All'
      })
      return []
    })
}

function _requestData (champs_names, process_name, mode) {
  const title_translations = {
    core_items: `${T.t('core-items', true)} - ${T.t('winrate', true)}: `,
    Starter: T.t('starting-items', true),
    'Core Alternatives - Endgame Items ': `${T.t('core_alternatives', true)} - ${T.t('endgame_items', true)}`,
    Boots: T.t('boots', true),
    'Situational Items': T.t('situational_items', true),
    Elixir: T.t('elixir', true),
    'Upgrade Ultimate': T.t('upgrade_ultimate', true)
  }

  return Promise.resolve(champs_names)
    .map(champ => {
      cl(`${T.t('processing')} U.gg ${T.t(process_name)}: ${T.t(champ.replace(/ /g, ''))}`)

      const params = {
        url: `https://u.gg/lol/champions//${champ}/build/?rank=overall`,
        json: true
      }

      return request(params)
        .then(riot_json => {
          if (!riot_json.blocks) throw new ChampionifyErrors.MissingData(`U.gg: ${champ} ${process_name}`)

          riot_json.blocks = riot_json.blocks.map(block => {
            if (block.type.indexOf('Core Items') > -1) {
              block.type = `${title_translations.core_items} ${block.type.split(': ')[1]}`
            } else if (title_translations[block.type]) {
              block.type = title_translations[block.type]
            } else {
              Log.warn(`U.gg: '${block.type}' does not exist in preset translations for ${champ}`)
            }
            return block
          })

          if (process_name === 'ARAM') {
            riot_json.blocks[0].items.push({ count: 1, id: '2047' })
            riot_json.map = 'HA'
          }

          if (process_name !== 'ARAM') {
            if (store.get('settings').locksr) riot_json.map = 'SR'
            riot_json.blocks.shift()
            riot_json.blocks = trinksCon(riot_json.blocks)
          }
          riot_json.title = `LFV ${T.t(process_name.toLowerCase(), true)} ${spliceVersion(store.get('riot_ver'))}`

          if (process_name === 'ARAM') {
            progressbar.incrChamp()
          } else {
            progressbar.incrChamp(5)
          }

          return { champ, file_prefix: process_name.toLowerCase(), riot_json, source: 'ugg' }
        })
        .catch(err => {
          Log.warn(err)
          store.push('undefined_builds', {
            source: source_info.name,
            champ,
            position: process_name
          })

          return null
        })
    }, { concurrency: 3 })
    .then(results => results.filter(result => result !== null))
}

function _processUgg (process_name, stats_file, mode) {
  Log.info(`Downloading ${process_name} Champs`)
  return _requestAvailableChamps(process_name, stats_file)
    .then(champs => _requestData(champs, process_name, mode))
}

export function getAram () {
  return _processUgg('ARAM', 'statsARAM.json', 'aram')
    .then(champs => store.set('aram_itemsets', champs))
}

export function getSr () {
  const stats_pages = [
    { name: 'Top', file: 'statsTop.json' },
    { name: 'Mid', file: 'statsMid.json' },
    { name: 'ADC', file: 'statsADC.json' },
    { name: 'Jungle', file: 'statsJungle.json' },
    { name: 'Support', file: 'statsSupport.json' }
  ]

  return Promise.resolve(stats_pages)
    .map(data => _processUgg(data.name, data.file, 'sr'))
    .then(results => results.flat())
    .then(data => store.push('sr_itemsets', data))
}

export function getVersion () {
  return request({ url: 'https://static.bigbrain.gg/assets/lol/riot_patch_update/prod/ugg/patches.json', json: true })
    .then(response => {
      if (!response) return T.t('unknown')
      const version = response[0]
      store.set('ugg_ver', version)
      return version
    })
    .catch(err => {
      Log.warn(err)
      return T.t('unknown')
    })
}
