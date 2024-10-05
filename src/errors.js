import os from 'os'
import SuperError from 'super-error'
import T from './translate.js'

const ChampionifyError = SuperError.subclass('ChampionifyError')
const errors = { ChampionifyError }

const error_types = [
  'ElevateError',
  'ExternalError',
  'FileWriteError',
  'MissingData',
  'OperationalError',
  'ParsingError',
  'TranslationError',
  'UncaughtException',
  'UpdateError'
]

error_types.forEach(error_name => {
  errors[error_name] = ChampionifyError.subclass(error_name, function () {
    this.type = error_name
    this.ua = [os.platform(), os.release()].join(' ')
    this.locale = T.locale
  })
})

errors.RequestError = ChampionifyError.subclass('RequestError', function (code, url, body) {
  this.code = code
  this.url = url
  this.body = body
  this.type = 'RequestError'
  this.ua = [os.platform(), os.release()].join(' ')
  this.locale = T.locale
})

export default errors
