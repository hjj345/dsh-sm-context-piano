/** Chat node to compact navigator-preview projection. */

import type { ChatConversationViewNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'

export interface KeyDescriptor {
  /** Equals the ChatView row's data-chat-anchor-key. */
  key: string
  /** First meaningful line shown as the preview title. */
  title: string
  /** Bounded plain-text preview; never injected as HTML. */
  preview: string
}

const PREVIEW_LIMIT = 520
const TITLE_LIMIT = 180

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
  root?: { name?: string; argsRaw?: string; content?: readonly ContentBlock[]; isError?: boolean }
  compaction?: { summary?: string | null } | null
  name?: string | null
  args?: string | null
  closing?: { blocks?: readonly BlockLike[] } | null
  turn?: number
  message?: string
}

/** Convert every currently rendered business node into safe preview text. */
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
  return { key: node.key, title: firstLine(preview), preview }
}
