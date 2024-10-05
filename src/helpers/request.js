import axios from 'axios'
import retry from 'async-retry'
import ChampionifyErrors from '../errors.js'

/**
 * Request retry configuration
 * @type {{retries: number, minTimeout: number, factor: number, maxTimeout: number}}
 */
const retry_options = {
  retries: 3,
  minTimeout: 1000,
  factor: 2,
  maxTimeout: 30000
}

/**
 * Limits for concurrent connections
 * The specified limits are based on existing limits in modern browsers (e.g firefox, chrome)
 * @type {{max_concurrent: number, max_concurrent_per_host: number}}
 */
const connection_limits = {
  max_concurrent: 17,
  max_concurrent_per_host: 6
}

/**
 * Counter for currently running requests
 * @type {{total: number, per_host: {}}}
 */
const active_connections = {
  total: 0,
  per_host: {}
}

/**
 * List for pending requests that have not been started yet
 * @type {Array}
 */
const waiting_tasks = []

/**
 * Checks if a request to the given hostname can be started
 * @param {String} hostname
 * @returns {boolean}
 */
function canStartRequest (hostname) {
  return active_connections.total < connection_limits.max_concurrent &&
      (active_connections.per_host[hostname] || 0) < connection_limits.max_concurrent_per_host
}

/**
 * Updates the request counter for the given hostname on request start
 * @param {String} hostname
 */
function onRequestStart (hostname) {
  active_connections.total++
  active_connections.per_host[hostname] = (active_connections.per_host[hostname] || 0) + 1
}

/**
 * Starts all requests that do not exceed request limits
 * This method is invoked whenever a new request has been queued or a running request finished
 */
function startAllAllowedRequests () {
  for (let i = 0; i < waiting_tasks.length; i++) {
    if (canStartRequest(waiting_tasks[i].hostname)) {
      onRequestStart(waiting_tasks[i].hostname)
      waiting_tasks[i].start()

      // remove request from waiting requests list and update loop index
      waiting_tasks.splice(i, 1)
      i--
    }
  }
}

/**
 * Updates the request counter for the given hostname on request finish
 * This method also invokes startAllAllowedRequests() after updating request counters
 * @param {String} hostname
 */
function onRequestFinish (hostname) {
  active_connections.total--
  active_connections.per_host[hostname]--

  if (active_connections.per_host[hostname] === 0) {
    delete active_connections.per_host[hostname]
  }

  startAllAllowedRequests()
}

/**
 * Extracts the hostname (as of RFC-3986) from the given url
 * @param {String} url
 * @returns {String} Hostname
 */
function getHostnameFromUrl (url) {
  const parts = url.match(/^(\w+:(\/\/)?)?([^:\/?#]*).*$/)
  return parts ? parts[3] : ''
}

/**
 * Makes request with retry and 404 handling
 * @param {Object/String} options
 * @returns {Promise.<Object|ChampionifyErrors.RequestError>} Request body
 */
export function request (options) {
  let params = { timeout: 10000 }

  if (typeof options === 'string') {
    params.url = options
  } else {
    params = { ...params, ...options }
  }

  const hostname = getHostnameFromUrl(params.url)

  return retry(async () => {
    return new Promise((resolve, reject) => {
      waiting_tasks.push({
        hostname,
        start: async () => {
          try {
            const res = await axios(params)
            onRequestFinish(hostname)

            if (res.status >= 400) {
              reject(new ChampionifyErrors.RequestError(res.status, params.url, res.data))
            } else {
              resolve(res.data)
            }
          } catch (err) {
            onRequestFinish(hostname)
            reject(new ChampionifyErrors.RequestError(err.name, params.url, err))
          }
        }
      })

      startAllAllowedRequests()
    })
  }, retry_options)
}
