import fs from 'fs-extra'
import { glob } from 'glob'
import path from 'path'
import sinon from 'sinon'

global.src_path = process.env.COVERAGE ? 'src-cov' : 'src'
const champions = require('./fixtures/all_champions.json').data
const T = require(`../${global.src_path}/translate`).default
require(`../${global.src_path}/store`)

window.$ = sinon.stub()
window.$.withArgs('#cl_progress').returns({ prepend: function () {} })

// Import champion translations so it can be used in all tests
let translations = Object.keys(champions).reduce((acc, key) => {
  acc[key] = champions[key].name
  return acc
}, {})

translations = Object.keys(translations).reduce((acc, key) => {
  acc[key.toLowerCase().replace(/ /g, '')] = translations[key]
  return acc
}, {})

translations.wukong = translations.monkeyking
T.merge(translations)

const glob_options = {
  realpath: true,
  nodir: true
}

const test_files = [
  ...glob.sync('./tests/*/*.js', glob_options),
  ...glob.sync('./tests/*(!(index.js)).js', glob_options)
]

test_files.forEach(test_case => require(test_case))

// hook into mocha global after to write coverage reports if found
after(function () {
  if (window.__coverage__) {
    console.log('Found coverage report, writing to coverage/coverage.json')
    const file_path = path.resolve(process.cwd(), 'coverage/coverage.json')
    fs.mkdirsSync(path.dirname(file_path))
    fs.writeFileSync(file_path, JSON.stringify(window.__coverage__))
  }
})
