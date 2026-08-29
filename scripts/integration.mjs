/** jsdom behavior checks for the Codex-style navigator. */

import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const requireHere = createRequire(import.meta.url)
const waitFrame = () => new Promise(resolve => setTimeout(resolve, 35))
let passed = 0
let failed = 0
const check = async (name, fn) => {
  try {
    await fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL  ${name}`)
    console.error(error)
  }
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://127.0.0.1:3080/',
  pretendToBeVisual: true,
})
const { window } = dom
const { document } = window

globalThis.window = window
globalThis.document = document
globalThis.MutationObserver = window.MutationObserver
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
}
window.matchMedia = () => ({ matches: false })

const root = document.createElement('div')
Object.defineProperties(root, {
  clientHeight: { value: 900, configurable: true },
  clientWidth: { value: 1280, configurable: true },
  getBoundingClientRect: {
    value: () => ({ left: 0, top: 0, right: 1280, bottom: 900, width: 1280, height: 900 }),
    configurable: true,
  },
})

const scrollport = document.createElement('div')
scrollport.setAttribute('data-conversation-scroll', '')
Object.defineProperties(scrollport, {
  clientHeight: { value: 800, configurable: true },
  clientWidth: { value: 1280, configurable: true },
  scrollTop: { value: 0, writable: true, configurable: true },
  getBoundingClientRect: {
    value: () => ({ left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800 }),
    configurable: true,
  },
})
scrollport.scrollTo = options => { scrollport.scrollTop = typeof options === 'number' ? options : (options?.top ?? 0) }

const flow = document.createElement('div')
flow.setAttribute('data-chat-flow', '')
Object.defineProperty(flow, 'getBoundingClientRect', {
  value: () => ({ left: 300, top: -scrollport.scrollTop, right: 1048, bottom: 1600 - scrollport.scrollTop, width: 748, height: 1600 }),
  configurable: true,
})

const keys = ['user:1', 'assistant:2', 'tool:3', 'assistant:3b', 'command:4', 'partial:5', 'tail:6']
const contentTops = [40, 260, 700, 900, 1100, 1200, 1280]
const appendRow = index => {
  const row = document.createElement('div')
  row.dataset.chatAnchorKey = keys[index]
  Object.defineProperty(row, 'getBoundingClientRect', {
    value: () => ({ left: 300, top: contentTops[index] - scrollport.scrollTop, right: 1048, bottom: contentTops[index] + 160 - scrollport.scrollTop, width: 748, height: 160 }),
    configurable: true,
  })
  flow.appendChild(row)
}
keys.forEach((_, index) => appendRow(index))
root.appendChild(scrollport)
scrollport.appendChild(flow)
document.body.appendChild(root)

const nodeMap = new Map([
  ['user:1', {
    key: 'user:1', kind: 'user', anchorSeq: 1,
    data: { content: [{ type: 'text', text: '修复右侧卡片截断问题\n已按照容器实际宽度重新计算列数。' }] },
  }],
  ['assistant:2', {
    key: 'assistant:2', kind: 'assistant-step', anchorSeq: 2,
    data: { turn: 1, step: 0, blocks: [{ kind: 'text', text: '第二个对话节点\n这里是助手回复的正文预览。' }] },
  }],
  ['tool:3', {
    key: 'tool:3', kind: 'tool-call', anchorSeq: 3,
    data: { root: { name: 'read_file', argsRaw: '{"path":"a.txt"}', content: [{ type: 'text', text: '工具结果' }] } },
  }],
  ['assistant:3b', {
    key: 'assistant:3b', kind: 'assistant-step', anchorSeq: 3.5,
    data: { turn: 1, step: 1, blocks: [{ kind: 'text', text: '工具执行后的助手结论' }] },
  }],
  ['command:4', {
    key: 'command:4', kind: 'command', anchorSeq: 4,
    data: { name: 'compact', args: null },
  }],
  ['partial:5', {
    key: 'partial:5', kind: 'partial', anchorSeq: 5,
    data: { turn: 1, step: 1, blocks: [{ kind: 'text', text: '流式中间状态' }] },
  }],
  ['tail:6', {
    key: 'tail:6', kind: 'turn-tail', anchorSeq: 6,
    data: { turn: 1, closing: null },
  }],
])
const snapshot = { chat: { order: [...keys], nodes: { get: key => nodeMap.get(key) } } }
let snapshotSubscriber = () => {}
const session = {
  getSnapshot: () => snapshot,
  subscribe: fn => { snapshotSubscriber = fn; return () => { snapshotSubscriber = () => {} } },
}
let currentSession = 's1'
let listSubscriber = () => {}
let settingsSnapshot = {
  status: 'ready', writable: true, revision: 1,
  value: { language: 'zh', enabled: true, keyHeight: 2, keyGap: 12, maxVisible: 20 },
}
const settingsSubscribers = new Set()
const publishSettings = (field, value) => {
  settingsSnapshot = {
    ...settingsSnapshot,
    revision: settingsSnapshot.revision + 1,
    value: { ...settingsSnapshot.value, [field]: value },
  }
  for (const subscriber of settingsSubscribers) subscriber()
}
const settingsScope = {
  getSnapshot: () => settingsSnapshot,
  subscribe: fn => { settingsSubscribers.add(fn); return () => { settingsSubscribers.delete(fn) } },
  set: async (field, value) => { publishSettings(field, value) },
  unset: async field => {
    const defaults = { language: 'zh', enabled: true, keyHeight: 2, keyGap: 12, maxVisible: 20 }
    publishSettings(field, defaults[field])
  },
}
let settingsSection
const ctx = {
  effect: fn => { const disposer = fn(); globalThis.__disposers.push(disposer); return disposer },
  locale: { register: () => {}, bind: () => key => key },
  sessions: {
    list: {
      getSnapshot: () => ({ current: currentSession }),
      subscribe: fn => { listSubscriber = fn; return () => { listSubscriber = () => {} } },
    },
    binding: id => id === 's1' ? { session } : undefined,
  },
  settingsScope: {
    bind: spec => {
      assert.equal(spec.namespace, 'sm-context-piano')
      return settingsScope
    },
  },
  slots: {
    inject: (name, callback) => {
      assert.equal(name, 'settings.section')
      callback()
    },
    register: (options, component) => {
      settingsSection = { options, component }
      return () => { settingsSection = undefined }
    },
  },
}
globalThis.__disposers = []

window.__ModuleLoader__ = { load: handoff => { globalThis.__handoff = handoff } }
await import('../lib/client.js')
const exports = globalThis.__handoff.factory(spec => {
  if (spec === 'react') return requireHere('react')
  if (spec === 'react/jsx-runtime') return requireHere('react/jsx-runtime')
  throw new Error(`unexpected require: ${spec}`)
})

await check('mounts only user messages and visible assistant output runs', async () => {
  exports.apply(ctx)
  await waitFrame()
  const strip = document.querySelector('.smcp-strip')
  assert.ok(strip)
  assert.equal(document.querySelectorAll('.smcp-bar').length, 3)
  assert.equal([...document.querySelectorAll('.smcp-bar')].filter(bar => !bar.hidden).length, 3)
  assert.equal(document.querySelector('[data-key="tool:3"]'), null)
  assert.equal(document.querySelector('[data-key="command:4"]'), null)
  assert.equal(document.querySelector('[data-key="partial:5"]'), null)
  assert.equal(strip.getAttribute('role'), 'navigation')
  assert.equal(Number.parseFloat(strip.style.height), 230)
  assert.equal(globalThis.__smcpDebug.hiddenReason, null)
})

await check('registers the first-level settings page directly after Agent Presets', async () => {
  assert.equal(settingsSection.options.id, 'sm-context-piano')
  assert.equal(settingsSection.options.order, 21)
  assert.equal(settingsSection.options.label(), 'settings.nav')
  assert.equal(settingsSection.options.inject().scope, settingsScope)

  const React = requireHere('react')
  const { act } = React
  const { createRoot } = requireHere('react-dom/client')
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const rootView = createRoot(mount)
  let copiedCommand = ''
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async text => { copiedCommand = text } },
  })
  await act(async () => {
    rootView.render(React.createElement(settingsSection.component, {
      ...settingsSection.options.inject(),
      close: () => {},
      t: key => key,
    }))
    await waitFrame()
  })
  assert.match(mount.textContent, /sm-context-piano/)
  assert.match(mount.textContent, /v1\.1/)
  assert.match(mount.textContent, /2026-08-28/)
  assert.match(mount.textContent, /Jack·Huang/)
  assert.match(mount.textContent, /dsh plugin --profile web add @hjj345345\/dsh-sm-context-piano/)
  assert.match(mount.textContent, /230px/)
  assert.match(mount.textContent, /通用设置/)
  assert.match(mount.textContent, /显示设置/)
  assert.match(mount.textContent, /关于插件/)
  assert.match(mount.textContent, /v1\.1\.1/)
  assert.match(mount.querySelector('.smcp-settings-icon').getAttribute('src'), /^data:image\/png;base64,/)
  const languageSelect = mount.querySelector('.smcp-settings-select')
  assert.equal(languageSelect.value, 'zh')
  assert.deepEqual([...languageSelect.options].map(option => option.textContent), ['简体中文', 'English', '繁體中文'])
  const commandBox = mount.querySelector('.smcp-settings-command-box')
  const installCard = commandBox.closest('.smcp-settings-install')
  assert.equal(mount.querySelectorAll('.smcp-settings-card').length, 4)
  assert.ok(installCard)
  assert.equal(installCard.querySelector('h2').textContent, '安装命令')
  assert.equal(commandBox.closest('.smcp-settings-about'), null)
  const aboutRows = [...mount.querySelectorAll('.smcp-settings-about dl > div')]
    .map(row => [row.querySelector('dt').textContent, row.querySelector('dd').textContent])
  assert.deepEqual(aboutRows.at(-2), ['GitHub', 'https://github.com/hjj345/dsh-sm-context-piano'])
  assert.deepEqual(aboutRows.at(-1), ['npm', '@hjj345345/dsh-sm-context-piano'])
  const githubLink = mount.querySelector('.smcp-settings-about a[href^="https://github.com/"]')
  assert.equal(githubLink.href, 'https://github.com/hjj345/dsh-sm-context-piano')
  assert.equal(githubLink.target, '_blank')
  assert.equal(githubLink.rel, 'noreferrer')
  const npmLink = mount.querySelector('.smcp-settings-about a[href^="https://www.npmjs.com/package/"]')
  assert.equal(npmLink.textContent, '@hjj345345/dsh-sm-context-piano')
  assert.equal(npmLink.href, 'https://www.npmjs.com/package/@hjj345345/dsh-sm-context-piano')
  assert.equal(npmLink.target, '_blank')
  assert.equal(npmLink.rel, 'noreferrer')
  await act(async () => {
    languageSelect.value = 'en'
    languageSelect.dispatchEvent(new window.Event('change', { bubbles: true }))
    await Promise.resolve()
  })
  assert.equal(settingsSnapshot.value.language, 'en')
  assert.match(mount.textContent, /General settings/)
  assert.match(mount.textContent, /Display/)
  assert.match(mount.textContent, /About/)
  assert.match(mount.textContent, /Install command/)
  assert.equal(settingsSection.options.label(), 'settings.nav')
  assert.equal(document.querySelector('.smcp-strip').getAttribute('aria-label'), 'nav.aria')
  await act(async () => {
    languageSelect.value = 'zh-TW'
    languageSelect.dispatchEvent(new window.Event('change', { bubbles: true }))
    await Promise.resolve()
  })
  assert.equal(settingsSnapshot.value.language, 'zh-TW')
  assert.match(mount.textContent, /通用設定/)
  assert.match(mount.textContent, /顯示設定/)
  assert.match(mount.textContent, /關於外掛/)
  assert.match(mount.textContent, /安裝命令/)
  assert.equal(settingsSection.options.label(), 'settings.nav')
  assert.equal(document.querySelector('.smcp-strip').getAttribute('aria-label'), 'nav.aria')
  await act(async () => {
    mount.querySelector('.smcp-settings-reset').click()
    await waitFrame()
  })
  assert.equal(settingsSnapshot.value.language, 'zh')
  assert.match(mount.textContent, /显示设置/)
  await act(async () => {
    commandBox.querySelector('button').click()
    await Promise.resolve()
  })
  assert.equal(copiedCommand, 'dsh plugin --profile web add @hjj345345/dsh-sm-context-piano')
  assert.equal(mount.querySelector('.smcp-settings-command-box button').textContent, '已复制')
  const styles = document.querySelector('#smcp-panel-styles').textContent
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) auto/)
  assert.match(styles, /white-space: pre-wrap/)
  assert.match(styles, /background: #f3f3f4/)
  assert.match(styles, /\.smcp-settings-select[\s\S]*border-radius: 9px/)
  assert.match(styles, /\.smcp-settings-reset[\s\S]*background: #161719[\s\S]*color: #fff/)
  assert.match(styles, /\.smcp-settings-command-box button[\s\S]*background: #161719[\s\S]*color: #fff/)
  assert.match(styles, /body\[data-ds-dark-theme\] \.smcp-settings-command-box[\s\S]*background: rgba\(255, 255, 255, \.08\)/)
  assert.match(styles, /body\[data-ds-dark-theme\] \.smcp-settings-command-box code[\s\S]*color: #f1f1f3/)
  assert.match(styles, /@media \(max-width: 520px\)/)
  assert.match(styles, /@media \(max-width: 360px\)/)
  await act(async () => { rootView.unmount() })
  mount.remove()
})

await check('live settings resize, limit, disable, and restore the rail', async () => {
  await settingsScope.set('keyHeight', 4)
  await settingsScope.set('keyGap', 8)
  await settingsScope.set('maxVisible', 5)
  await waitFrame()
  let strip = document.querySelector('.smcp-strip')
  assert.equal(Number.parseFloat(strip.style.height), 36)
  assert.ok([...document.querySelectorAll('.smcp-bar')].every(bar => Number.parseFloat(bar.style.height) === 4))

  await settingsScope.set('enabled', false)
  await waitFrame()
  assert.equal(document.querySelector('.smcp-strip'), null)
  await settingsScope.set('enabled', true)
  await settingsScope.set('keyHeight', 2)
  await settingsScope.set('keyGap', 12)
  await settingsScope.set('maxVisible', 20)
  await waitFrame()
  await waitFrame()
  strip = document.querySelector('.smcp-strip')
  assert.ok(strip)
  assert.equal(Number.parseFloat(strip.style.height), 230)
})

await check('keeps a compact fixed-pitch stack centered in the rail', () => {
  const strip = document.querySelector('.smcp-strip')
  const bars = [...document.querySelectorAll('.smcp-bar')].filter(bar => !bar.hidden)
  assert.ok(bars.every(bar => Number.parseFloat(bar.style.height) === 2))
  const centers = bars.map(bar => Number.parseFloat(bar.style.top) + Number.parseFloat(bar.style.height) / 2)
  assert.equal(centers[1] - centers[0], 12)
  assert.equal(centers[2] - centers[1], 12)
  assert.equal((centers[0] + centers[2]) / 2, Number.parseFloat(strip.style.height) / 2)
})

await check('the full rail continuously drives the hover wave and preview', async () => {
  const strip = document.querySelector('.smcp-strip')
  const railHeight = Number.parseFloat(strip.style.height)
  Object.defineProperty(strip, 'getBoundingClientRect', {
    value: () => ({ left: 192, top: 250, right: 250, bottom: 250 + railHeight, width: 58, height: railHeight }),
    configurable: true,
  })
  const bars = [...document.querySelectorAll('.smcp-bar')]
  const secondY = Number.parseFloat(bars[1].style.top) + Number.parseFloat(bars[1].style.height) / 2
  strip.dispatchEvent(new window.MouseEvent('pointermove', { clientY: 250 + secondY, bubbles: true }))
  await waitFrame()
  assert.ok(bars[1].classList.contains('smcp-bar-hover'))
  assert.ok(Number.parseFloat(bars[1].style.width) > Number.parseFloat(bars[0].style.width))
  const tooltip = document.querySelector('.smcp-tooltip')
  assert.ok(tooltip.classList.contains('smcp-tooltip-visible'))
  const title = tooltip.querySelector('.smcp-tooltip-title')
  assert.equal(title.tagName, 'DIV')
  assert.equal(window.getComputedStyle(title).fontWeight, '400')
  assert.match(tooltip.textContent, /第二个对话节点/)
  assert.doesNotMatch(tooltip.textContent, /token|工具|read_file|assistant/i)
})

await check('clicking the rail jumps to the currently previewed node', () => {
  const strip = document.querySelector('.smcp-strip')
  strip.dispatchEvent(new window.MouseEvent('click', { clientY: 342, bubbles: true }))
  assert.equal(scrollport.scrollTop, contentTops[1] - 16)
})

await check('scroll updates active color and length immediately', async () => {
  const strip = document.querySelector('.smcp-strip')
  strip.dispatchEvent(new window.MouseEvent('pointerleave'))
  scrollport.scrollTop = 320
  scrollport.dispatchEvent(new window.Event('scroll'))
  await waitFrame()
  const bars = [...document.querySelectorAll('.smcp-bar')]
  assert.ok(bars[1].classList.contains('smcp-bar-current'))
  assert.equal(Number.parseFloat(bars[1].style.width), 24)
  assert.equal(Number.parseFloat(bars[0].style.width), 10)
})

await check('snapshot updates retain existing marker elements', async () => {
  const first = document.querySelector('[data-key="user:1"]')
  keys.push('assistant:7')
  contentTops.push(1420)
  nodeMap.set('assistant:7', {
    key: 'assistant:7', kind: 'assistant-step', anchorSeq: 7,
    data: { turn: 2, step: 0, blocks: [{ kind: 'text', text: '新增回复' }] },
  })
  snapshot.chat.order.push('assistant:7')
  appendRow(7)
  snapshotSubscriber()
  await waitFrame()
  assert.equal(document.querySelectorAll('.smcp-bar').length, 4)
  assert.equal(document.querySelector('[data-key="user:1"]'), first)
})

await check('an open preview follows streaming descriptor updates', async () => {
  const strip = document.querySelector('.smcp-strip')
  const last = document.querySelector('[data-key="assistant:7::output:0"]')
  const y = Number.parseFloat(last.style.top) + Number.parseFloat(last.style.height) / 2
  strip.dispatchEvent(new window.MouseEvent('pointermove', { clientY: 250 + y, bubbles: true }))
  await waitFrame()
  nodeMap.set('assistant:7', {
    key: 'assistant:7', kind: 'assistant-step', anchorSeq: 7,
    data: { turn: 2, step: 0, blocks: [{ kind: 'text', text: '流式更新后的回复\n预览必须同步刷新。' }] },
  })
  snapshotSubscriber()
  await waitFrame()
  assert.match(document.querySelector('.smcp-tooltip').textContent, /流式更新后的回复/)
})

await check('keyboard navigation previews and activates a marker', async () => {
  const strip = document.querySelector('.smcp-strip')
  strip.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }))
  strip.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await waitFrame()
  assert.equal(scrollport.scrollTop, contentTops[7] - 16)
})

await check('shows at most 20 keys and recenters after selecting the top boundary', async () => {
  flow.textContent = ''
  keys.splice(0)
  contentTops.splice(0)
  nodeMap.clear()
  snapshot.chat.order.splice(0)
  for (let index = 0; index < 25; index += 1) {
    const key = `user:window:${index}`
    keys.push(key)
    contentTops.push(index * 100)
    nodeMap.set(key, {
      key, kind: 'user', anchorSeq: 100 + index,
      data: { content: [{ type: 'text', text: `用户节点 ${index}` }] },
    })
    snapshot.chat.order.push(key)
    appendRow(index)
  }
  scrollport.scrollTop = 1200
  snapshotSubscriber()
  await waitFrame()
  await waitFrame()
  assert.equal(globalThis.__smcpDebug.total, 25)
  assert.equal(globalThis.__smcpDebug.bars, 20)
  assert.equal(globalThis.__smcpDebug.windowStart, 3)
  assert.equal(document.querySelector('[data-key="user:window:2"]').hidden, true)
  assert.equal(document.querySelector('[data-key="user:window:3"]').hidden, false)

  const strip = document.querySelector('.smcp-strip')
  const top = document.querySelector('[data-key="user:window:3"]')
  const topY = Number.parseFloat(top.style.top) + Number.parseFloat(top.style.height) / 2
  strip.dispatchEvent(new window.MouseEvent('pointermove', { clientY: 250 + topY, bubbles: true }))
  await waitFrame()
  strip.dispatchEvent(new window.MouseEvent('click', { clientY: 250 + topY, bubbles: true }))
  await waitFrame()
  assert.equal(globalThis.__smcpDebug.windowStart, 0)
  assert.equal(document.querySelector('[data-key="user:window:0"]').hidden, false)
})

await check('a single rendered node stays centered on the rail', async () => {
  flow.textContent = ''
  keys.splice(0, keys.length, 'user:solo')
  contentTops.splice(0, contentTops.length, 80)
  nodeMap.clear()
  nodeMap.set('user:solo', {
    key: 'user:solo', kind: 'user', anchorSeq: 999,
    data: { content: [{ type: 'text', text: '单节点' }] },
  })
  snapshot.chat.order.splice(0, snapshot.chat.order.length, 'user:solo')
  appendRow(0)
  scrollport.scrollTop = 0
  snapshotSubscriber()
  await waitFrame()
  const strip = document.querySelector('.smcp-strip')
  const bar = document.querySelector('.smcp-bar')
  const center = Number.parseFloat(bar.style.top) + Number.parseFloat(bar.style.height) / 2
  assert.ok(Math.abs(center - Number.parseFloat(strip.style.height) / 2) < 0.2)
})

await check('session disappearance clears markers without stale content', async () => {
  currentSession = undefined
  listSubscriber()
  await waitFrame()
  assert.equal(document.querySelectorAll('.smcp-bar').length, 0)
  assert.equal(globalThis.__smcpDebug.sessionId, undefined)
})

await check('dispose removes every injected runtime surface', () => {
  for (const disposer of globalThis.__disposers) if (typeof disposer === 'function') disposer()
  assert.equal(document.querySelector('.smcp-strip'), null)
  assert.equal(document.querySelector('.smcp-tooltip'), null)
  assert.equal(globalThis.__smcpDebug, undefined)
})

console.log(`\n${passed} integration checks passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
