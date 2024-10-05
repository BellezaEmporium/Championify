import championify from './championify.js'
import { spliceVersion } from './helpers/index.js'
import Log from './logger.js'
import preferences from './preferences.js'
import sources, { sources_info } from './sources/index.js'
import store from './store.js'
import T from './translate.js'

// Import compiled Marko components
const templates = {
  indexTemplate: require('./components/index.marko'),
  mainTemplate: require('./components/main.marko'),
  completeTemplate: require('./components/complete.marko'),
  errorTemplate: require('./components/error.marko'),
  updateTemplate: require('./components/update.marko'),
  manualUpdateTemplate: require('./components/manual_update.marko')
}

// Use dynamic import for package.json
let pkg
import('../package.json').then(module => {
  pkg = module
})

/**
 * Helper to grab the selected sources if any.
 */
function _selectedSources () {
  const prefs = preferences.load()
  return prefs && prefs.options && prefs.options.sr_source ? prefs.options.sr_source.filter(Boolean).join(',') : ''
}

function _setBrowseTitle () {
  if (process.platform === 'darwin') {
    store.set('browse_title', `${T.t('select')} League of Legends.app`)
  } else {
    store.set('browse_title', `${T.t('select')} League of Legends ${T.t('directory')}`)
  }
}

/**
 * Change all views with the same transitions.
 * @param {Function} template Marko template function
 * @param {Object} options Options to be passed to Marko render
 * @param {Function} [next] Function to load before view
 */
function _viewChanger (template, options = {}, next) {
  _setBrowseTitle()
  const default_options = {
    transition: 'browse',
    div_id: 'view',
    render: { T, browse_title: store.get('browse_title') }
  }

  options = Object.assign(
    {},
    default_options,
    options,
    { render: { ...default_options.render, ...(options.render || {}) } }
  )

  const viewElement = document.getElementById(options.div_id)
  viewElement.classList.add('fade-up')
  viewElement.addEventListener('animationend', function onAnimationEnd () {
    viewElement.removeEventListener('animationend', onAnimationEnd)
    const html = template.renderSync(options.render)
    viewElement.innerHTML = html
    if (next) next()
    viewElement.classList.add(options.transition)
  })
}

/**
 * Sets initial view with settings
 */
function _initSettings () {
  document.getElementById('locale_flag').className = `${T.flag()} flag`
  document.getElementById('select_language_text').textContent = T.t('select_language')
  document.querySelector(`#locals_select .item[data-value='${T.locale}']`).classList.add('active')
  document.getElementById('footer_help').textContent = T.t('help')
  document.querySelectorAll('.ui.popup.top.left.transition.visible').forEach(el => el.remove())
  document.querySelectorAll('.options_tooltip').forEach(el => el.popup())
  document.querySelectorAll('.ui.dropdown').forEach(el => el.dropdown())

  document.getElementById('locals_select').dropdown({
    action: 'activate',
    onChange: function (value, text, $selector) {
      if (store.get('importing')) return null

      T.loadPhrases($selector.getAttribute('data-value'))
      _setBrowseTitle()
      return _viewChanger('main', {
        div_id: 'view',
        transition: 'fade',
        render: {
          browse_title: store.get('browse_title'),
          platform: process.platform,
          sources: sources_info,
          selected_sources: _selectedSources()
        }
      }, _initSettings)
    }
  })

  if (store.get('lol_ver')) {
    document.getElementById('lol_version').textContent = store.get('lol_ver')
  } else {
    championify.getVersion()
      .then(version => {
        version = spliceVersion(version)
        document.getElementById('lol_version').textContent = version
        store.set('lol_ver', version)
      })
      .catch(Log.warn)
  }

  sources_info.forEach(source => {
    if (store.get(`${source.id}_ver`)) {
      document.getElementById(`${source.id}_version`).textContent = store.get(`${source.id}_ver`)
    } else {
      sources[source.id].getVersion()
        .then(version => document.getElementById(`${source.id}_version`).textContent = version)
        .catch(Log.warn)
    }
  })

  return preferences.set(preferences.load())
}

/**
 * Change to complete view with transitions.
 */
function completeView () {
  function loadUnavailable () {
    const undefined_builds = (store.get('undefined_builds') || [])
      .sort((a, b) => a.source.localeCompare(b.source))
      .map(entry => {
        const champ_translation = T.t(entry.champ)
        if (!champ_translation) return
        return `<span>${entry.source} ${champ_translation}: ${T.t(entry.position)}</span><br />`
      })
      .filter(Boolean)

    if (!undefined_builds.length) {
      document.getElementById('not_available_log').innerHTML += `<span>${T.t('all_available')}</span><br />`
    } else {
      undefined_builds.forEach(entry => document.getElementById('not_available_log').innerHTML += entry)
    }
  }
  return _viewChanger(templates.completeTemplate, {}, loadUnavailable)
}

/**
 * Change to error view with transitions.
 */
function errorView () {
  return _viewChanger(templates.errorTemplate)
}

/**
 * Change to complete view with transitions.
 */
function updateView () {
  return _viewChanger(templates.updateTemplate)
}

/**
 * Change to breaking changes view with transitions.
 */
function manualUpdateView () {
  return _viewChanger(templates.manualUpdateTemplate)
}

/**
 * Change to main view with reverse transitions.
 */
function mainViewBack () {
  function resetMain () {
    document.getElementById('cl_progress').innerHTML = ''
    document.querySelectorAll('.submit_btns').forEach(el => el.classList.remove('hidden'))
    document.querySelectorAll('.status').forEach(el => el.className = 'status')
    _initSettings()
  }

  return _viewChanger(templates.mainTemplate, {
    transition: 'fly right',
    render: {
      browse_title: store.get('browse_title'),
      sources: sources_info,
      selected_sources: _selectedSources()
    }
  }, resetMain)
}

/**
 * Loads initial view when the app loads.
 * @returns {Promise}
 */
function init () {
  _setBrowseTitle()
  const options = {
    T,
    browse_title: store.get('browse_title'),
    platform: process.platform,
    sources: sources_info,
    selected_sources: _selectedSources(),
    version: pkg ? pkg.version : 'Unknown'
  }

  const html = templates.indexTemplate.renderSync(options)
  document.getElementById('body').innerHTML = html
  return _initSettings()
}

export default {
  complete: completeView,
  error: errorView,
  update: updateView,
  mainBack: mainViewBack,
  manualUpdate: manualUpdateView,
  init
}
