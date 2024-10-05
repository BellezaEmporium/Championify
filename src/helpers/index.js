import Promise from 'bluebird';
import { exec } from "child_process";
import { ipcRenderer } from 'electron';

import ChampionifyErrors from '../errors.js';
import Log from '../logger.js';
import store from '../store.js';
import T from '../translate.js';
import viewManager from '../view_manager.js';

// Export methods defined in request.js
export * from './request.js';

import prebuilts from "../../data/prebuilts.json" with { type: "json" };

/**
 * Function if error exists, enable error view and log error ending the session.
 * @param {Object} Error instance
 */
export function EndSession(c_error) {
  Log.error(c_error);
  window.error_message = c_error.message || c_error.rootCause.message;
  viewManager.error();
  return false;
}

/**
 * Re-executes Championify with elevated privileges, closing the current process if successful. Throws an error if user declines. Only works on Windows.
 * @param {Array} Command line parameters
 * @returns {Promise.Boolean|ChampionifyErrors.ElevateError}
 */
export function elevate(params = []) {
  return ipcRenderer.invoke('elevate', params);
}

/**
 * Splice version number to two.
 * @param {String} Version number
 * @returns {String} Two digit version number
 */
export function spliceVersion(version) {
  return version.split('.').splice(0, 2).join('.');
}

/**
 * Pretty console log, as well as updates the progress div on interface
 * @param {String} Console Message.
 * @param {String} [level='info'] Logging level
 */
export function cl(text, level = 'info') {
  Log[level](text);
  const progressDiv = document.getElementById('cl_progress');
  if (progressDiv) {
    const span = document.createElement('span');
    span.textContent = text;
    progressDiv.prepend(span);
    progressDiv.prepend(document.createElement('br'));
  }
}

/**
 * Capitalizes first letter of string
 * @param {String} String
 */
export function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Reusable function for generating Trinkets and Consumables on build blocks.
 * @param {Array} Array of blocks for item sets
 * @param {Object} Formatted skill priorities
 * @returns Array of block item sets with added trinkets and consumables
 */
export function trinksCon(builds, skills = {}) {
  if (store.get('settings').consumables) {
    let consumables_title = T.t('consumables', true);
    if (skills.most_freq) consumables_title += ` | ${T.t('frequent', true)}: ${skills.most_freq}`;

    const consumables_block = {
      items: prebuilts.consumables,
      type: consumables_title
    };
    if (store.get('settings').consumables_position === 'beginning') {
      builds.unshift(consumables_block);
    } else {
      builds.push(consumables_block);
    }
  }

  if (store.get('settings').trinkets) {
    let trinkets_title = T.t('trinkets', true);
    if (skills.highest_win) trinkets_title += ` | ${T.t('wins', true)}: ${skills.highest_win}`;

    const trinkets_block = {
      items: prebuilts.trinket_upgrades,
      type: trinkets_title
    };
    if (store.get('settings').trinkets_position === 'beginning') {
      builds.unshift(trinkets_block);
    } else {
      builds.push(trinkets_block);
    }
  }
  return builds;
}

/**
 * Converts an array of skills to a shortanded representation
 * @param {Array} Array of skills (as letters)
 * @returns String Shorthand representation
 */
export function shorthandSkills(skills) {
  let skill_count = skills.slice(0, 9).reduce((acc, skill) => {
    skill = skill.toLowerCase();
    if (skill !== 'r') {
      acc[skill] = (acc[skill] || 0) + 1;
    }
    return acc;
  }, {});

  skill_count = Object.entries(skill_count).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
  }, {});

  const counts = Object.keys(skill_count).sort((a, b) => b - a);

  const skill_order = counts.map(count_num => skill_count[count_num].toUpperCase());
  return `${skills.slice(0, 4).join('.')} - ${skill_order.join('>')}`;
}

/**
 * Converts an array of IDs to item blocks with the correct counts
 * @param {Array} Array of ids
 * @returns Array of block item
 */
export function arrayToBuilds(ids) {
  ids = ids.map(id => {
    id = id.toString();
    if (id === '2010') id = '2003'; // Biscuits
    return id;
  });

  const counts = ids.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  return [...new Set(ids)].map(id => ({
    id,
    count: counts[id]
  }));
}
