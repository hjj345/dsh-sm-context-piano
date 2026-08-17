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
  value: () => ({ left: 300, top: -scrollport.scrollTop, right: 1048, bottom: 1300 - scrollport.scrollTop, width: 748, height: 1300 }),
  configurable: true,
})

const keys = ['user:1', 'assistant:2', 'tool:3']
const contentTops = [40, 260, 900]
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
    data: { blocks: [{ kind: 'text', text: '第二个对话节点\n这里是助手回复的正文预览。' }] },
  }],
  ['tool:3', {
    key: 'tool:3', kind: 'tool-call', anchorSeq: 3,
    data: { root: { name: 'read_file', argsRaw: '{"path":"a.txt"}', content: [{ type: 'text', text: '工具结果' }] } },
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
}
globalThis.__disposers = []

window.__ModuleLoader__ = { load: handoff => { globalThis.__handoff = handoff } }
await import('../lib/client.js')
const exports = globalThis.__handoff.factory(spec => {
  if (spec === 'react') return requireHere('react')
  if (spec === 'react/jsx-runtime') return requireHere('react/jsx-runtime')
  throw new Error(`unexpected require: ${spec}`)
})

await check('mounts one incremental marker per rendered conversation node', async () => {
  exports.apply(ctx)
  await waitFrame()
  const strip = document.querySelector('.smcp-strip')
  assert.ok(strip)
  assert.equal(document.querySelectorAll('.smcp-bar').length, 3)
  assert.equal(strip.getAttribute('role'), 'navigation')
  assert.equal(globalThis.__smcpDebug.hiddenReason, null)
})

await check('projects real content spacing instead of distributing by index', () => {
  const bars = [...document.querySelectorAll('.smcp-bar')]
  const positions = bars.map(bar => Number.parseFloat(bar.style.top))
  assert.ok(positions[1] - positions[0] < positions[2] - positions[1], positions.join(', '))
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
  assert.match(tooltip.textContent, /第二个对话节点/)
  assert.doesNotMatch(tooltip.textContent, /token|工具|assistant/i)
})

await check('clicking the rail jumps to the currently previewed node', () => {
  const strip = document.querySelector('.smcp-strip')
  strip.dispatchEvent(new window.MouseEvent('click', { clientY: 300, bubbles: true }))
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
  keys.push('assistant:4')
  contentTops.push(1180)
  nodeMap.set('assistant:4', {
    key: 'assistant:4', kind: 'assistant-step', anchorSeq: 4,
    data: { blocks: [{ kind: 'text', text: '新增回复' }] },
  })
  snapshot.chat.order.push('assistant:4')
  appendRow(3)
  snapshotSubscriber()
  await waitFrame()
  assert.equal(document.querySelectorAll('.smcp-bar').length, 4)
  assert.equal(document.querySelector('[data-key="user:1"]'), first)
})

await check('an open preview follows streaming descriptor updates', async () => {
  const strip = document.querySelector('.smcp-strip')
  const last = document.querySelector('[data-key="assistant:4"]')
  const y = Number.parseFloat(last.style.top) + Number.parseFloat(last.style.height) / 2
  strip.dispatchEvent(new window.MouseEvent('pointermove', { clientY: 250 + y, bubbles: true }))
  await waitFrame()
  nodeMap.set('assistant:4', {
    key: 'assistant:4', kind: 'assistant-step', anchorSeq: 4,
    data: { blocks: [{ kind: 'text', text: '流式更新后的回复\n预览必须同步刷新。' }] },
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
  assert.equal(scrollport.scrollTop, contentTops[3] - 16)
})

await check('a single rendered node stays centered on the rail', async () => {
  snapshot.chat.order.splice(0, snapshot.chat.order.length, 'assistant:4')
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
