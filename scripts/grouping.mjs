/** Pure semantic-grouping regression checks. */

import assert from 'node:assert/strict'
import { buildNavigationGroups } from '../src/client/keys.ts'

const node = (key, kind, turn = null, callId = null) => ({
  key,
  kind,
  title: key,
  preview: key,
  turn,
  callId,
})

const groups = buildNavigationGroups([
  node('user:1', 'user'),
  node('assistant:2', 'assistant-step', 1),
  node('tool-call:3', 'tool-call', null, 'call-1'),
  node('tool-result:4', 'tool-result', null, 'call-1'),
  node('assistant:5', 'assistant-step', 1),
  node('partial:6', 'partial', 1),
  node('tail:7', 'turn-tail', 1),
  node('user:8', 'user'),
  node('assistant:9', 'assistant-step', 2),
])

assert.equal(groups.length, 4, 'user/assistant turns stay separate')
assert.deepEqual(groups[1].members.map(member => member.key), [
  'assistant:2',
  'tool-result:4',
  'assistant:5',
], 'same-turn assistant steps merge and tool result replaces its call row')
assert.ok(groups.flatMap(group => group.members).every(member => member.kind !== 'partial' && member.kind !== 'turn-tail'))
assert.deepEqual(buildNavigationGroups([node('partial:1', 'partial')]), [])

console.log('  ok  semantic grouping (4 assertions)')
