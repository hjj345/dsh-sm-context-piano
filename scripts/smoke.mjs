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
  for (const name of ['@deepseek-ai/dsh-api-remotes', '@deepseek-ai/dsh-settings', '@deepseek-ai/schemastery']) {
    assert.equal(manifest.dependencies?.[name], undefined)
    assert.ok(manifest.peerDependencies?.[name])
    assert.ok(manifest.devDependencies?.[name])
  }
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-settings'], '^0.1.7-rc.1')
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-api-remotes'], '^0.1.7-rc.1')
})

check('manifest requests the DSH 0.1.7 settings and remotes APIs', () => {
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'))
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-chat'))
})

const host = await import('../lib/index.js')
check('host exports volatile profile settings and opts out of generated page', () => {
  let configured
  const fiber = {}
  host.apply({
    inject: (services, callback) => {
      assert.deepEqual(services, ['settings'])
      callback({
        fiber,
        effect: fn => fn(),
        settings: { configure: (...args) => { configured = args; return () => {} } },
      })
    },
    fiber,
  })
  assert.deepEqual(configured, [{ auto: false }, fiber])
  const serialized = host.Config.toJSON()
  const fields = serialized.refs[serialized.uid].dict
  for (const name of ['language', 'enabled', 'keyHeight', 'keyGap', 'maxVisible']) {
    assert.equal(serialized.refs[fields[name]].meta.volatile, true)
  }
  assert.equal(serialized.refs[fields.keyHeight].meta.min, 1)
  assert.equal(serialized.refs[fields.keyHeight].meta.max, 4)
  assert.equal(serialized.refs[fields.keyGap].meta.min, 6)
  assert.equal(serialized.refs[fields.keyGap].meta.max, 18)
  assert.equal(serialized.refs[fields.maxVisible].meta.min, 5)
  assert.equal(serialized.refs[fields.maxVisible].meta.max, 30)
  assert.doesNotThrow(() => host.Config())
  assert.throws(() => host.Config({ keyHeight: 2.5 }))
  assert.throws(() => host.Config({ keyGap: 6.5 }))
  assert.throws(() => host.Config({ maxVisible: 20.5 }))
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
  assert.deepEqual(exports.inject, ['sessions', 'uiConversation', 'locale', 'slots', 'remote'])
  assert.equal(typeof exports.apply, 'function')
})

let smokeScope
let settingsEntry = {
  ns: 'sm-context-piano', revision: 1,
  value: { language: 'zh', enabled: true, keyHeight: 2, keyGap: 12, maxVisible: 20 },
}
let onDocumentUpdated = () => {}
check('client binds profile settings and registers the settings page', () => {
  const registrations = []
  const sections = []
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
    uiConversation: {
      binding: () => ({ target: () => ({ getSnapshot: () => undefined, subscribe: () => () => {} }) }),
    },
    remote: {
      settings: {
        describe: async () => ({ writable: true, namespaces: [settingsEntry] }),
        mutate: async (ns, ops, revision) => {
          assert.equal(ns, 'sm-context-piano')
          assert.equal(revision, settingsEntry.revision)
          for (const op of ops) {
            if (op.op === 'set') settingsEntry = { ...settingsEntry, value: { ...settingsEntry.value, [op.path[0]]: op.value } }
            else settingsEntry = { ...settingsEntry, value: { ...settingsEntry.value, [op.path[0]]: { language: 'zh', enabled: true, keyHeight: 2, keyGap: 12, maxVisible: 20 }[op.path[0]] } }
          }
          settingsEntry = { ...settingsEntry, revision: settingsEntry.revision + 1 }
          onDocumentUpdated(ns, settingsEntry.revision)
          return settingsEntry
        },
      },
      $on: (event, listener) => {
        assert.equal(event, 'settings/document-updated')
        onDocumentUpdated = listener
        return () => { onDocumentUpdated = () => {} }
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
  assert.equal(effects, 4)
  assert.equal(registrations[0][0], 'sm-context-piano')
  assert.equal(sections.length, 1)
  assert.equal(sections[0][0].id, 'sm-context-piano')
  assert.equal(sections[0][0].order, 21)
  assert.equal(sections[0][0].label(), 'settings.nav')
  const scope = sections[0][0].inject().scope
  smokeScope = scope
  assert.equal(typeof scope.set, 'function')
  assert.equal(typeof scope.unset, 'function')
  assert.equal(typeof sections[0][1], 'function')
})

await new Promise(resolve => setImmediate(resolve))
check('settings remote reads and writes the profile entry', () => {
  assert.equal(smokeScope.getSnapshot().status, 'ready')
  assert.equal(smokeScope.getSnapshot().value.language, 'zh')
})
await smokeScope.set('language', 'en')
check('settings writes persist and publish the updated value', () => {
  assert.equal(settingsEntry.value.language, 'en')
  assert.equal(smokeScope.getSnapshot().value.language, 'en')
})
settingsEntry = { ...settingsEntry, revision: settingsEntry.revision + 1, value: { ...settingsEntry.value, language: 'zh-TW' } }
onDocumentUpdated('sm-context-piano', settingsEntry.revision)
await new Promise(resolve => setImmediate(resolve))
check('external profile edits refresh the client snapshot', () => {
  assert.equal(smokeScope.getSnapshot().value.language, 'zh-TW')
})

console.log(`\n${passed} smoke checks passed${process.exitCode === 1 ? ' (some failed)' : ''}`)
