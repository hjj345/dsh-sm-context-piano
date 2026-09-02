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
const manifest = requireHere('../package.json')
check('host core packages are peer-only', () => {
  for (const name of ['@deepseek-ai/dsh-settings', '@deepseek-ai/schemastery']) {
    assert.equal(manifest.dependencies?.[name], undefined)
    assert.ok(manifest.peerDependencies?.[name])
    assert.ok(manifest.devDependencies?.[name])
  }
  assert.match(manifest.peerDependencies['@deepseek-ai/dsh-settings'], /\^0\.0\.1-rc\.1/)
  assert.match(manifest.peerDependencies['@deepseek-ai/dsh-settings'], /\^0\.1\.1-rc\.1/)
})

check('settings peer declares alpha.4 compatibility', () => {
  assert.match(
    manifest.peerDependencies['@deepseek-ai/dsh-settings'],
    /\^0\.1\.2-alpha\.1/,
  )
})

const host = await import('../lib/index.js')
check('host registers one live settings namespace', () => {
  let registration
  host.apply({
    inject: (services, callback) => {
      assert.deepEqual(services, ['settings'])
      callback({ settings: { register: (...args) => { registration = args } } })
    },
  })
  assert.equal(typeof registration[0], 'string')
  assert.equal(registration[0], 'sm-context-piano')
  assert.equal(registration[2].applies, 'live')
  assert.doesNotThrow(() => registration[2].validate({ language: 'zh', enabled: true, keyHeight: 2, keyGap: 12, maxVisible: 20 }))
  assert.throws(() => registration[2].validate({ language: 'fr', enabled: true, keyHeight: 2, keyGap: 12, maxVisible: 20 }))
  assert.throws(() => registration[2].validate({ language: 'zh', enabled: true, keyHeight: 5, keyGap: 12, maxVisible: 20 }))
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
  assert.equal(globalThis.__handoff.id, '@hjj345345/dsh-sm-context-piano')
  assert.equal(typeof globalThis.__handoff.factory, 'function')
})

const exports = globalThis.__handoff.factory(spec => {
  if (spec === 'react') return requireHere('react')
  if (spec === 'react/jsx-runtime') return requireHere('react/jsx-runtime')
  throw new Error(`unexpected require: ${spec}`)
})

check('client exposes the DSH plugin contract', () => {
  assert.deepEqual(exports.inject, ['sessions', 'locale', 'slots', 'settingsScope', 'connection', 'remote'])
  assert.equal(typeof exports.apply, 'function')
})

check('client apply registers locale, settings section, and three disposable effects', () => {
  const registrations = []
  const sections = []
  let effects = 0
  const scope = {
    getSnapshot: () => ({
      status: 'ready', writable: true, revision: 1,
      value: { language: 'zh', enabled: true, keyHeight: 2, keyGap: 12, maxVisible: 20 },
    }),
    subscribe: () => () => {},
    set: async () => {},
    unset: async () => {},
  }
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
    settingsScope: {
      bind: spec => {
        assert.equal(spec.namespace, 'sm-context-piano')
        return scope
      },
    },
    slots: {
      inject: (name, callback) => {
        assert.equal(name, 'settings.section')
        callback()
      },
      register: (options, component) => {
        sections.push([options, component])
        return () => {}
      },
    },
  })
  assert.equal(effects, 3)
  assert.equal(registrations[0][0], 'sm-context-piano')
  assert.equal(sections.length, 1)
  assert.equal(sections[0][0].id, 'sm-context-piano')
  assert.equal(sections[0][0].order, 21)
  assert.equal(sections[0][0].label(), 'settings.nav')
  assert.equal(sections[0][0].inject().scope, scope)
  assert.equal(typeof sections[0][1], 'function')
})

console.log(`\n${passed} smoke checks passed${process.exitCode === 1 ? ' (some failed)' : ''}`)
