import { rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const targets = ['.next', path.join('node_modules', '.cache')]

for (const rel of targets) {
  const dir = path.join(root, rel)
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`Removed ${rel}`)
  }
}

console.log('Next.js cache cleared.')
