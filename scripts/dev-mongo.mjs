// Starts the local dev MongoDB with a persistent data directory inside the
// repo (dev/.mongo-data, gitignored) so dev data survives reboots and temp
// cleaners. Resolves the mongod binary from PATH or the mongodb-memory-server
// download cache.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const dbPath = resolve('dev/.mongo-data')
mkdirSync(dbPath, { recursive: true })

function findBinary() {
  if (process.env.MONGOD_PATH) {
    return process.env.MONGOD_PATH
  }

  const onPath = spawnSync('mongod', ['--version'], { stdio: 'ignore' })

  if (onPath.status === 0) {
    return 'mongod'
  }

  const cacheDir = join(
    homedir(),
    '.cache',
    'mongodb-binaries',
  )

  try {
    const match = readdirSync(cacheDir).find((name) => name.startsWith('mongod-') && !name.endsWith('.mdmp'))

    if (match) {
      return join(cacheDir, match)
    }
  } catch {
    // cache dir missing — fall through to the error below
  }

  console.error(
    'mongod not found: put it on PATH or set MONGOD_PATH to the binary location.',
  )
  process.exit(1)
}

const port = process.env.MONGO_PORT ?? '27017'

const child = spawnSync(
  findBinary(),
  ['--dbpath', dbPath, '--port', port, '--bind_ip', '127.0.0.1'],
  { stdio: 'inherit' },
)

process.exitCode = child.status ?? 1
