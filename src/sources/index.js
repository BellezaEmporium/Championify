import { glob } from 'glob'
import path from 'path'

const source_names = []
const sources = {}

const sourcePaths = glob.sync(path.join(__dirname, './*(!(index.js))'))

sourcePaths.forEach(source_path => {
  const source = require(source_path)

  // Temp workaround to avoid broken tests
  if (!source.source_info) source.source_info = {}

  sources[source.source_info.id] = source
  source_names.push(source.source_info)
})

source_names.sort((a, b) => a.name.localeCompare(b.name))

export default sources
export const sources_info = source_names
