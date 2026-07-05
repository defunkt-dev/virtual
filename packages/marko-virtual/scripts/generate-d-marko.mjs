// Regenerates the committed .d.marko files from the tag sources via
// @marko/type-check (mtc). Manual, on-demand: run `pnpm types:generate` after
// changing a tag's Input or return surface. CI never generates — it only
// VERIFIES (test:types) that the committed .d.marko still agree with the tags.
//
// Pipeline:
//   1. mtc checker must pass on the current sources (don't generate from
//      broken types).
//   2. Delete the existing .d.marko (mtc prefers them as input when present —
//      leaving them would regenerate from the old files, not the tags).
//   3. Emit via tsconfig.emit.json. NOTE: mtc may exit 1 here purely from
//      TS6059 rootDir complaints about the cross-package virtual-core paths
//      mapping — a known benign artifact in emit mode. The script therefore
//      verifies the expected files were EMITTED instead of trusting the exit
//      code, and step 5 re-verifies the result properly.
//   4. Copy the emitted index.d.marko files back beside their sources; remove
//      the emit directory.
//   5. mtc checker must pass again with the regenerated files in place.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const emitDir = join(pkgRoot, '.d-marko-emit')
const tags = ['virtualizer', 'window-virtualizer']

const run = (cmd, opts = {}) =>
  execSync(cmd, { cwd: pkgRoot, stdio: 'inherit', ...opts })

const check = (label) => {
  console.log(`\n[types:generate] ${label}`)
  run('mtc -p tsconfig.typecheck.json')
}

check('1/5 verifying current sources type-check')

console.log('\n[types:generate] 2/5 removing existing .d.marko (mtc would prefer them as input)')
for (const tag of tags) {
  rmSync(join(pkgRoot, 'src/tags', tag, 'index.d.marko'), { force: true })
}

console.log('\n[types:generate] 3/5 emitting (TS6059 rootDir noise here is benign)')
rmSync(emitDir, { recursive: true, force: true })
try {
  run('mtc -p tsconfig.emit.json')
} catch {
  // Exit 1 expected from TS6059; real problems are caught by the file check
  // below and the re-verification in step 5.
}

console.log('\n[types:generate] 4/5 copying generated files back')
for (const tag of tags) {
  // outDir mirrors the inferred rootDir, so locate the file rather than
  // hardcoding the depth.
  const candidates = [
    join(emitDir, 'src/tags', tag, 'index.d.marko'),
    join(emitDir, 'tags', tag, 'index.d.marko'),
  ]
  const emitted = candidates.find((p) => existsSync(p))
  if (!emitted) {
    rmSync(emitDir, { recursive: true, force: true })
    console.error(`\n[types:generate] FAILED: no emitted index.d.marko for "${tag}".`)
    console.error('Restore the previous files from git and inspect the emit output.')
    process.exit(1)
  }
  cpSync(emitted, join(pkgRoot, 'src/tags', tag, 'index.d.marko'))
  console.log(`  ${tag}/index.d.marko regenerated`)
}
rmSync(emitDir, { recursive: true, force: true })

check('5/5 verifying the regenerated files')
console.log('\n[types:generate] done — review the diff and commit.')
