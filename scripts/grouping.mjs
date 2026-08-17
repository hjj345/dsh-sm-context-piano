/** Pure visible-output segmentation and fixed-window regression checks. */

import assert from 'node:assert/strict'
import { buildNavigationNodes } from '../src/client/keys.ts'
import { stackPositions, visibleWindow } from '../src/client/strip.ts'

const nodes = [
  {
    key: 'user:1', kind: 'user',
    data: { content: [{ type: 'text', text: '修复琴键定位' }] },
  },
  {
    key: 'assistant:2', kind: 'assistant-step',
    data: { turn: 1, blocks: [{ kind: 'text', text: '先分析问题。' }, { kind: 'text', text: '再提出方案。' }] },
  },
  {
    key: 'assistant:3', kind: 'assistant-step',
    data: { turn: 1, blocks: [{ kind: 'text', text: '连续输出合并。' }] },
  },
  {
    key: 'tool:4', kind: 'tool-call',
    data: { root: { name: 'edit', argsRaw: 'strip.ts' } },
  },
  {
    key: 'assistant:5', kind: 'assistant-step',
    data: {
      turn: 1,
      blocks: [
        { kind: 'reasoning', text: '内部推理' },
        { kind: 'text', text: '工具后的第一段输出。' },
        { kind: 'tool-call', name: 'read' },
        { kind: 'text', text: '工具后的第二段输出。' },
      ],
    },
  },
  {
    key: 'user:6', kind: 'steering',
    data: { content: [{ type: 'text', text: '继续优化' }] },
  },
]

const result = buildNavigationNodes(nodes)
assert.equal(result.length, 5)
assert.deepEqual(result.map(item => item.role), ['user', 'assistant', 'assistant', 'assistant', 'user'])
assert.equal(result[1].key, 'assistant:2::output:0')
assert.equal(result[2].key, 'assistant:5::output:0')
assert.equal(result[3].key, 'assistant:5::output:1')
assert.match(result[1].preview, /先分析问题[\s\S]*连续输出合并/)
assert.match(result[2].preview, /工具后的第一段输出/)
assert.match(result[3].preview, /工具后的第二段输出/)
assert.ok(result.every(item => !/内部推理|edit|read/.test(item.preview)))

assert.deepEqual(visibleWindow(30, 15), { start: 5, end: 25 })
assert.deepEqual(visibleWindow(5, 4), { start: 0, end: 5 })
const positions = stackPositions(5)
assert.equal(positions.length, 5)
assert.ok(positions.every((position, index) => index === 0 || position - positions[index - 1] === 18))
assert.equal((positions[0] + positions[positions.length - 1]) / 2, 173)

console.log('  ok  visible output segmentation and fixed window (14 assertions)')
