import Promise from 'bluebird'
import kleur from 'kleur'
import { glob } from 'glob'
import gulp from 'gulp'
import path from 'path'
import prompt from 'prompt'
import request from 'request'

const fs = Promise.promisifyAll(require('fs-extra'))
const GT = Promise.promisify(require('google-translate')(process.env.GOOGLE_TRANSLATE_API).translate)
const requester = Promise.promisify(request)

const transifexUrl = `https://${process.env.TRANSIFEX_KEY}@www.transifex.com/api/2/project/championify/`

// Function to fetch supported languages from Transifex
async function fetchSupportedLanguages () {
  try {
    const response = await requester(`${transifexUrl}languages/`)
    const languages = JSON.parse(response.body)
    return languages.map(lang => lang.language_code)
  } catch (error) {
    console.error('Error fetching supported languages from Transifex:', error)
    throw error
  }
}

// Fetch supported languages and assign to supported_languages variable
let supported_languages = []
fetchSupportedLanguages().then(languages => {
  supported_languages = languages
}).catch(error => {
  console.error('Failed to fetch supported languages:', error)
})

gulp.task('translate', function () {
  const translations_path = path.join(__dirname, '../i18n')
  const translationFiles = glob.sync(`${translations_path}/*(!(_source.json))`)
  const translations = Object.fromEntries(translationFiles.map(file_name => {
    return [path.basename(file_name).replace(/.json/g, ''), require(file_name)]
  }))

  const source_path = path.join(translations_path, '_source.json')
  const _source = require(source_path)

  function toTitleCase (str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }

  function translate (lang, key) {
    if (typeof _source[key] === 'string') {
      _source[key] = {
        text: _source[key],
        done: false
      }
    }

    if (lang === 'en') {
      translations.en[key] = _source[key].text
      return
    }

    if (!_source[key].done || !translations[lang][key]) {
      return GT(_source[key].text, 'en', lang)
        .tap(data => {
          // If the key is the same, sometimes google translate doesn't like how letters are capitalized.
          if (_source[key].text === data.translatedText) {
            return GT(toTitleCase(_source[key].text), 'en', lang)
          }
        })
        .then(data => translations[lang][key] = data.translatedText)
    }
  }

  return Promise.resolve(supported_languages)
    .each(lang => {
      console.log(`Translating: ${lang}`)
      if (!translations[lang]) translations[lang] = {}

      return Promise.resolve(Object.keys(_source))
        .map(key => translate(lang, key), { concurrency: 10 })
        .then(() => {
          const sorted_translations = {}
          Object.keys(translations[lang]).sort().forEach(key => {
            sorted_translations[key] = translations[lang][key]
          })

          return fs.writeFileAsync(`${translations_path}/${lang}.json`, JSON.stringify(sorted_translations, null, 2))
        })
    })
    .then(() => {
      const sorted_source = {}
      Object.keys(_source).sort().forEach(key => {
        sorted_source[key] = _source[key]
        sorted_source[key].done = true
      })

      return fs.writeFileAsync(source_path, JSON.stringify(sorted_source, null, 2), 'utf8')
    })
    .then(() => console.log('Done'))
})

gulp.task('transifex:upload', function () {
  const translations_path = path.join(__dirname, '../i18n')
  const translationFiles = glob.sync(`${translations_path}/*(!(_source.json|en.json))`)
  let translations = translationFiles.map(file_path => {
    return {
      lang: path.basename(file_path).replace(/.json/g, ''),
      file_path
    }
  })
  translations = [{ lang: 'en', file_path: path.join(translations_path, 'en.json') }].concat(translations)

  function uploadTranslation (data) {
    let url
    if (data.lang === 'en') {
      url = `https://${process.env.TRANSIFEX_KEY}@www.transifex.com/api/2/project/championify/resource/english-source/content/`
    } else {
      url = `https://${process.env.TRANSIFEX_KEY}@www.transifex.com/api/2/project/championify/resource/english-source/translation/${data.lang}/`
    }

    console.log(`Uploading: ${data.lang}`)
    const options = {
      method: 'PUT',
      url,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data'
      }
    }

    return new Promise((resolve, reject) => {
      const req = request(options, function (err, res, body) {
        if (err) return reject(err)
        console.log(res.statusCode)
        console.log(body)
        resolve()
      })

      req.form().append('file', fs.createReadStream(data.file_path))
    })
  }

  return Promise.resolve(translations)
    .each(uploadTranslation)
    .then(() => console.log('Done'))
})

gulp.task('transifex:review', function () {
  const translations_path = path.join(__dirname, '../i18n')
  const translationFiles = glob.sync(`${translations_path}/*(!(_source.json|en.json))`)
  const translations = Object.fromEntries(translationFiles.map(file_name => {
    return [path.basename(file_name).replace(/.json/g, ''), require(file_name)]
  }))
  const _source = require(path.join(translations_path, '_source.json'))

  const new_translations = {}
  const to_review = Object.fromEntries(Object.keys(translations).map(lang => [lang, {}]))
  const transifex_langs = {
    'zh-cn': 'zh-Hans',
    'zh-tw': 'zh-Hant'
  }

  const trans_keys = Promise.resolve(Object.keys(translations))
  return trans_keys
    .map(lang => {
      const url = `https://${process.env.TRANSIFEX_KEY}@www.transifex.com/api/2/project/championify/resource/english-source/translation/${transifex_langs[lang] || lang}/?mode=default&file`
      return requester(url)
        .then(res => res.body)
        .then(body => JSON.parse(body))
        .then(body => {
          new_translations[lang] = body
          Object.keys(body).forEach(key => {
            if (translations[lang][key] !== new_translations[lang][key]) {
              to_review[lang][key] = {
                translation: new_translations[lang][key],
                original: translations[lang][key]
              }
            }
          })
        })
    }, { concurrency: 10 })
    .return(trans_keys)
    .each(lang => {
      if (!Object.keys(to_review[lang]).length) return

      return Promise.resolve(Object.keys(to_review[lang]))
        .map(key => {
          return GT(to_review[lang][key].translation, lang, 'en')
            .then(res => {
              to_review[lang][key].reserve = res.translatedText
            })
        }, { concurrency: 1 })
        .then(() => {
          Object.keys(to_review[lang]).forEach(key => {
            console.log(`-----------------------------------
  Lang        | ${kleur.white.bold(lang)}
  Key         | ${kleur.red.bold(key)}
  English     | ${kleur.blue.bold(_source[key] ? _source[key].text : '!!!MISSING!!!')}
  Reserve     | ${kleur.green.bold(to_review[lang][key].reserve)}
  Old Trans   | ${kleur.yellow.bold(to_review[lang][key].original)}
  New Trans   | ${kleur.magenta.bold(to_review[lang][key].translation)}`)
          })

          return new Promise((resolve, reject) => {
            prompt.start()
            const params = {
              properties: {
                answer: {
                  message: 'Would you like to save these translations? [y/n]',
                  required: true
                }
              }
            }

            prompt.get(params, (err, res) => {
              if (err) return reject(err)

              if (res.answer === 'y') {
                const merged_translations = { ...translations[lang], ...new_translations[lang] }
                resolve(fs.writeFileAsync(path.join(translations_path, `${lang}.json`), JSON.stringify(merged_translations, null, 2), 'utf8'))
              } else {
                console.log(kleur.red.bold('Translation not saved...'))
                resolve()
              }
            })
          })
        })
    })
    .then(() => console.log('Review Done'))
    .catch(err => {
      console.log(err)
      throw err
    })
})
