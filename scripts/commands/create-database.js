const { db, file, parser, logger } = require('../core')
const { program } = require('commander')
const _ = require('lodash')

const options = program
  .option(
    '--max-clusters <max-clusters>',
    'Set maximum number of clusters',
    parser.parseNumber,
    200
  )
  .option('--channels <channels>', 'Set path to channels.xml file', 'sites/**/*.channels.xml')
  .parse(process.argv)
  .opts()

const channels = []

async function main() {
  logger.info('Starting...')
  logger.info(`Number of clusters: ${options.maxClusters}`)

  await loadChannels()
  await saveToDatabase()

  logger.info('Done')
}

main()

async function loadChannels() {
  logger.info(`Loading channels...`)

  const files = await file.list(options.channels)
  for (const filepath of files) {
    const dir = file.dirname(filepath)
    const items = await parser.parseChannels(filepath)
    for (const item of items) {
      item.channelsPath = filepath
      item.configPath = `${dir}/${item.site}.config.js`
      channels.push(item)
    }
  }
  logger.info(`Found ${channels.length} channels`)
}

async function saveToDatabase() {
  logger.info('Saving to the database...')

  await db.reset()
  const chunks = split(_.shuffle(channels), options.maxClusters)
  for (const [i, chunk] of chunks.entries()) {
    for (const item of chunk) {
      item.cluster_id = i + 1
      await db.insert(item)
    }
  }
}

function split(arr, n) {
  let result = []
  for (let i = n; i > 0; i--) {
    result.push(arr.splice(0, Math.ceil(arr.length / i)))
  }
  return result
}
