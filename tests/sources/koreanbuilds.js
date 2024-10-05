import fs from 'fs'
import { glob } from 'glob'
import nock from 'nock'
import path from 'path'

const koreanbuilds = require(`../../${global.src_path}/sources/koreanbuilds`)
const store = require(`../../${global.src_path}/store`).default

require('chai').should()
let nocked = null

const RESPONSES_FIXTURES = {}
glob.sync(path.join(__dirname, 'fixtures/koreanbuilds/responses/*.html')).forEach(fixture => {
  RESPONSES_FIXTURES[path.basename(fixture).replace('.html', '')] = fs.readFileSync(fixture, 'utf8')
})

const RESULTS_FIXTURES = {}
glob.sync(path.join(__dirname, 'fixtures/koreanbuilds/results/*.json')).forEach(fixture => {
  RESULTS_FIXTURES[path.basename(fixture).replace('.json', '')] = require(fixture)
})

function nockSR () {
  nocked
    .get('/')
    .reply(200, RESPONSES_FIXTURES.index)
    .get('/roles?championid=103')
    .reply(200, RESPONSES_FIXTURES.roles)
    .get('/champion/Ahri/Mid/6.6/-1')
    .reply(200, RESPONSES_FIXTURES.ahri)
}

describe('src/sources/koreanbuilds', () => {
  before(() => {
    nocked = nock('http://koreanbuilds.net')
    store.set('koreanbuilds_ver', '6.6')
  })

  describe('version', () => {
    it('should get the stubbed koreanbuilds version', () => {
      nocked.get('/').reply(200, RESPONSES_FIXTURES.index)
      return koreanbuilds.getVersion().then(version => {
        version.should.equal('6.6')
      })
    })
  })

  describe('summoners rift', () => {
    beforeEach(() => {
      store.remove('sr_itemsets')
    })

    afterEach(() => {
      nock.cleanAll()
    })

    it('should return items for ahri middle', () => {
      nockSR()
      store.set('settings', { consumables: true })
      return koreanbuilds.getSr().then(champs => {
        const itemsets = [].concat(...store.get('sr_itemsets'))
        if (process.env.BUILD_FIXTURES === 'true') {
          fs.writeFileSync(path.join(__dirname, 'fixtures/koreanbuilds/results/ahri_normal.json'), JSON.stringify(itemsets, null, 2), 'utf8')
        }
        itemsets.should.eql(RESULTS_FIXTURES.ahri_normal)
      })
    })

    it('should return items for ahri middle with shorthand skills', () => {
      nockSR()
      store.set('settings', { skillsformat: true, consumables: true })
      return koreanbuilds.getSr().then(champs => {
        const itemsets = [].concat(...store.get('sr_itemsets'))
        if (process.env.BUILD_FIXTURES === 'true') {
          fs.writeFileSync(path.join(__dirname, 'fixtures/koreanbuilds/results/ahri_shorthand.json'), JSON.stringify(itemsets, null, 2), 'utf8')
        }
        itemsets.should.eql(RESULTS_FIXTURES.ahri_shorthand)
      })
    })
  })
})
