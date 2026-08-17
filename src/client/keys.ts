/** Chat node projection and semantic navigator grouping. */

import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'

export interface KeyDescriptor {
  /** Equals the ChatView row's data-chat-anchor-key. */
  key: string
  kind: string
  title: string
  preview: string
  turn: number | null
  /** Joins a tool call and its later result when Harness exposes both rows. */
  callId: string | null
}

export interface NavigationGroup {
  id: string
  primaryKey: string
  members: readonly KeyDescriptor[]
}

const PREVIEW_LIMIT = 520
const TITLE_LIMIT = 180
const NOISE_KINDS = new Set(['partial', 'running-tool', 'turn-tail', 'model-retry'])
const ASSISTANT_KINDS = new Set(['assistant', 'assistant-step'])
const TOOL_KINDS = new Set(['tool-call', 'tool-result'])

function truncate(text: string, limit: number): string {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit).trimEnd()}…`
}

function firstLine(text: string): string {
  return truncate(text.split('\n').find(line => line.trim() !== '') ?? '…', TITLE_LIMIT)
}

function contentText(blocks: readonly ContentBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    } else {
      const call = block as { name?: unknown; arguments?: unknown }
      if (typeof call.name === 'string') {
        parts.push(typeof call.arguments === 'string' ? `${call.name}(${call.arguments})` : call.name)
      } else if (block.type === 'image') {
        parts.push('[image]')
      }
    }
  }
  return parts.join('\n')
}

type BlockLike = { kind?: string; text?: string; name?: string; argsRaw?: string }

function blockText(blocks: readonly BlockLike[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if ((block.kind === 'text' || block.kind === 'reasoning') && typeof block.text === 'string') {
      parts.push(block.text)
    } else if (block.kind === 'tool-call') {
      parts.push(`${block.name ?? 'tool'}(${block.argsRaw ?? ''})`)
    }
  }
  return parts.join('\n')
}

interface NodeData {
  content?: readonly ContentBlock[]
  blocks?: readonly BlockLike[]
  root?: { callId?: string; name?: string; argsRaw?: string; content?: readonly ContentBlock[]; isError?: boolean }
  compaction?: { summary?: string | null } | null
  name?: string | null
  args?: string | null
  closing?: { blocks?: readonly BlockLike[] } | null
  turn?: number
  message?: string
}

export function describeNode(node: ChatConversationViewNode): KeyDescriptor {
  const data = node.data as NodeData
  let text = ''

  if (Array.isArray(data.blocks)) {
    text = blockText(data.blocks)
  } else if (Array.isArray(data.content)) {
    text = contentText(data.content)
  } else if (data.root !== undefined && data.root !== null) {
    const args = data.root.argsRaw === undefined || data.root.argsRaw === '' ? '' : `(${data.root.argsRaw})`
    const heading = `${data.root.isError ? 'Error: ' : ''}${data.root.name ?? 'tool'}${args}`
    const result = Array.isArray(data.root.content) ? contentText(data.root.content) : ''
    text = result === '' ? heading : `${heading}\n${result}`
  } else if (data.compaction !== undefined) {
    text = data.compaction?.summary?.trim() || '/compact'
  } else if (typeof data.name === 'string' || data.name === null) {
    text = data.name === null ? 'command' : `/${data.name}${data.args ? ` ${data.args}` : ''}`
  } else if (data.closing !== undefined) {
    text = data.closing === null ? `turn ${data.turn ?? ''}` : blockText(data.closing.blocks ?? [])
  } else if (typeof data.message === 'string') {
    text = data.message
  }

  const preview = truncate(text === '' ? node.kind : text, PREVIEW_LIMIT)
  return {
    key: node.key,
    kind: node.kind,
    title: firstLine(preview),
    preview,
    turn: typeof data.turn === 'number' ? data.turn : null,
    callId: data.root?.callId ?? null,
  }
}

/**
 * Reduce internal Harness rows to user-meaningful groups. Tool rows stay as
 * expandable children; transient status rows do not become navigator marks.
 */
export function buildNavigationGroups(descriptors: readonly KeyDescriptor[]): NavigationGroup[] {
  const groups: Array<{ id: string; primaryKey: string; category: string; turn: number | null; members: KeyDescriptor[] }> = []

  for (const descriptor of descriptors) {
    if (NOISE_KINDS.has(descriptor.kind)) continue

    const current = groups[groups.length - 1]
    if (TOOL_KINDS.has(descriptor.kind)) {
      const group = current ?? {
        id: descriptor.key,
        primaryKey: descriptor.key,
        category: 'tool',
        turn: descriptor.turn,
        members: [],
      }
      if (current === undefined) groups.push(group)
      const pairedIndex = descriptor.callId === null
        ? -1
        : group.members.findIndex(member => member.callId === descriptor.callId && TOOL_KINDS.has(member.kind))
      if (pairedIndex >= 0) {
        const replaced = group.members[pairedIndex]
        group.members[pairedIndex] = descriptor
        if (group.primaryKey === replaced.key) {
          group.id = descriptor.key
          group.primaryKey = descriptor.key
        }
      } else {
        group.members.push(descriptor)
      }
      continue
    }

    if (ASSISTANT_KINDS.has(descriptor.kind)) {
      const sameTurn = current?.category === 'assistant'
        && (descriptor.turn === null || current.turn === null || descriptor.turn === current.turn)
      if (sameTurn) {
        current.members.push(descriptor)
      } else {
        groups.push({
          id: descriptor.key,
          primaryKey: descriptor.key,
          category: 'assistant',
          turn: descriptor.turn,
          members: [descriptor],
        })
      }
      continue
    }

    groups.push({
      id: descriptor.key,
      primaryKey: descriptor.key,
      category: descriptor.kind,
      turn: descriptor.turn,
      members: [descriptor],
    })
  }

  return groups.map(({ id, primaryKey, members }) => ({ id, primaryKey, members }))
}
