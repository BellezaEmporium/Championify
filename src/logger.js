import path from 'path'
import winston from 'winston'

import ChampionifyErrors from './errors.js'
import { EndSession } from './helpers/index.js'
import preferences from './preferences.js'

/**
 * Winston logger
 */
const Log = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'test' ? 'emerg' : 'debug',
      handleExceptions: true
    }),
    new winston.transports.File({
      filename: path.join(preferences.directory(), 'championify.log.txt'),
      json: true,
      handleExceptions: true,
      prettyPrint: true,
      level: process.env.NODE_ENV === 'test' ? 'emerg' : 'debug',
      options: { flags: 'w' }
    })
  ],
  exitOnError: false,
})

Log.exitOnError = function (err) {
  let e
  if (typeof err === 'string') {
    e = new ChampionifyErrors.UncaughtException(err)
  } else {
    e = new ChampionifyErrors.UncaughtException().causedBy(err)
  }
  EndSession(e)
  return false
}

export default Log
