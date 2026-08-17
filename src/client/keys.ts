/** User-message and visible-assistant-output projection for the navigator. */

import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'

export interface KeyDescriptor {
  /** Stable navigator identity; output segments after the first use a suffix. */
  key: string
  /** ChatView row used as the scroll target. */
  anchorKey: string
  role: 'user' | 'assistant'
  title: string
  preview: string
  turn: number | null
}

const PREVIEW_LIMIT = 520
const TITLE_LIMIT = 140
const USER_KINDS = new Set(['user', 'steering'])
const ASSISTANT_KINDS = new Set(['assistant', 'assistant-step'])

function truncate(text: string, limit: number): string {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit).trimEnd()}…`
}

function titleOf(text: string): string {
  const first = text.split('\n').find(line => line.trim() !== '') ?? '…'
  return truncate(first.replace(/^\s*(?:#{1,6}|>|[-*+] |\d+[.)]\s*)\s*/, ''), TITLE_LIMIT)
}

function contentText(blocks: readonly ContentBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    else if (block.type === 'image') parts.push('[image]')
  }
  return parts.join('\n')
}

type BlockLike = { kind?: string; text?: string }
interface NodeData {
  content?: readonly ContentBlock[]
  blocks?: readonly BlockLike[]
  turn?: number
}

interface OutputRuns {
  runs: string[]
  startsWithText: boolean
  endsWithText: boolean
}

/** Split visible text whenever reasoning, tools, or another hidden block interrupts it. */
function outputRuns(data: NodeData): OutputRuns {
  if (!Array.isArray(data.blocks)) {
    const text = Array.isArray(data.content) ? contentText(data.content).trim() : ''
    return { runs: text === '' ? [] : [text], startsWithText: text !== '', endsWithText: text !== '' }
  }

  const runs: string[] = []
  let current: string[] = []
  const flush = (): void => {
    const text = current.join('\n').trim()
    if (text !== '') runs.push(text)
    current = []
  }
  for (const block of data.blocks) {
    if (block.kind === 'text' && typeof block.text === 'string' && block.text.trim() !== '') current.push(block.text)
    else flush()
  }
  flush()
  return {
    runs,
    startsWithText: data.blocks[0]?.kind === 'text',
    endsWithText: data.blocks[data.blocks.length - 1]?.kind === 'text',
  }
}

function descriptor(
  node: ChatConversationViewNode,
  role: 'user' | 'assistant',
  text: string,
  suffix = '',
): KeyDescriptor {
  const preview = truncate(text, PREVIEW_LIMIT)
  const data = node.data as NodeData
  return {
    key: `${node.key}${suffix}`,
    anchorKey: node.key,
    role,
    title: titleOf(preview),
    preview,
    turn: typeof data.turn === 'number' ? data.turn : null,
  }
}

/**
 * Produce only user messages and visible assistant text. Adjacent assistant
 * output runs merge; any hidden/non-output node or block breaks continuity.
 */
export function buildNavigationNodes(nodes: readonly ChatConversationViewNode[]): KeyDescriptor[] {
  const result: KeyDescriptor[] = []
  let continuableAssistant: KeyDescriptor | null = null

  for (const node of nodes) {
    const data = node.data as NodeData
    if (USER_KINDS.has(node.kind)) {
      continuableAssistant = null
      const text = Array.isArray(data.content) ? contentText(data.content).trim() : ''
      if (text !== '') result.push(descriptor(node, 'user', text))
      continue
    }

    if (!ASSISTANT_KINDS.has(node.kind)) {
      continuableAssistant = null
      continue
    }

    const output = outputRuns(data)
    if (output.runs.length === 0) {
      continuableAssistant = null
      continue
    }

    for (let index = 0; index < output.runs.length; index += 1) {
      const text = output.runs[index]
      const mergeTarget = index === 0
        && output.startsWithText
        && continuableAssistant !== null
        && (continuableAssistant.turn === null || data.turn === undefined || continuableAssistant.turn === data.turn)
        ? continuableAssistant
        : null
      if (mergeTarget !== null) {
        mergeTarget.preview = truncate(`${mergeTarget.preview}\n\n${text}`, PREVIEW_LIMIT)
      } else {
        const next = descriptor(node, 'assistant', text, `::output:${index}`)
        result.push(next)
        continuableAssistant = next
      }
      if (index < output.runs.length - 1) continuableAssistant = null
    }
    if (!output.endsWithText) continuableAssistant = null
  }

  return result
}
