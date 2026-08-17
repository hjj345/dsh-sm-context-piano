/** Built-bundle smoke checks. Run after `pnpm build`. */

import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const requireHere = createRequire(import.meta.url)
let passed = 0
const check = (name, fn) => {
  try {
    fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (error) {
    console.error(`FAIL  ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

console.log('== host half ==')
const host = await import('../lib/index.js')
check('host stays inert', () => {
  assert.deepEqual(host.inject, [])
  assert.doesNotThrow(() => host.apply())
})

console.log('== client half ==')
globalThis.window = {
  __ModuleLoader__: { load: handoff => { globalThis.__handoff = handoff } },
  addEventListener: () => {},
  removeEventListener: () => {},
}
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({ textContent: '', id: '' }),
  head: { appendChild: () => {} },
}

await import('../lib/client.js')
check('client bundle registers its handoff', () => {
  assert.equal(globalThis.__handoff.id, '@linxin666/dsh-sm-context-piano')
  assert.equal(typeof globalThis.__handoff.factory, 'function')
})

const exports = globalThis.__handoff.factory(spec => {
  if (spec === 'react') return requireHere('react')
  if (spec === 'react/jsx-runtime') return requireHere('react/jsx-runtime')
  throw new Error(`unexpected require: ${spec}`)
})

check('client exposes the DSH plugin contract', () => {
  assert.deepEqual(exports.inject, ['sessions', 'locale'])
  assert.equal(typeof exports.apply, 'function')
})

check('client apply registers locale and three disposable effects', () => {
  const registrations = []
  let effects = 0
  exports.apply({
    effect: fn => { effects += 1; fn(); return () => {} },
    locale: {
      register: (namespace, dictionaries) => registrations.push([namespace, dictionaries]),
      bind: () => key => key,
    },
    sessions: {
      list: { getSnapshot: () => ({ current: undefined }), subscribe: () => () => {} },
      binding: () => undefined,
    },
  })
  assert.equal(effects, 3)
  assert.equal(registrations[0][0], 'sm-context-piano')
})

console.log(`\n${passed} smoke checks passed${process.exitCode === 1 ? ' (some failed)' : ''}`)
