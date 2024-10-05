import fs from 'fs'
import { glob } from 'glob'
import path from 'path'

const should = require('chai').should()
const _source = JSON.parse(fs.readFileSync(path.join(__dirname, '../i18n/_source.json')))

const keys_count = Object.keys(_source).length
const locales = {}

function isPR () {
  if (process.env.TRAVIS_PULL_REQUEST && process.env.TRAVIS_PULL_REQUEST !== 'false') return true
  if (process.env.APPVEYOR_PULL_REQUEST_NUMBER) return true
  return false
}

if (!isPR()) {
  describe('i18n', () => {
    before(() => {
      const locales_files = glob.sync('./i18n/*.json')
      locales_files.shift()
      locales_files.forEach(locale_path => {
        const locale = path.basename(locale_path).replace('.json', '')
        locales[locale] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', locale_path)))
      })
    })

    describe('each locale', () => {
      it('should have the same length of keys as _source', () => {
        Object.keys(locales).forEach(locale => {
          Object.keys(locales[locale]).length.should.equal(keys_count)
        })
      })
      it('should contain the same keys as _source', () => {
        Object.keys(_source).forEach(key => {
          Object.keys(locales).forEach(locale => {
            should.exist(locales[locale][key])
          })
        })
      })
    })
  })
}
