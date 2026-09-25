import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { ChatConversationViewNode, ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'

export type ChatNavigationNode = ChatConversationViewNode
export interface ChatTarget {
  getSnapshot(): ChatSnapshot | undefined
  subscribe(listener: () => void): () => void
}

/** DSH exposes the selected Session through session-scoped UI slots. */
export interface CurrentSessionSource {
  getSnapshot(): SessionId | undefined
  subscribe(listener: () => void): () => void
  activate(sessionId: SessionId): () => void
}

export function createCurrentSessionSource(): CurrentSessionSource {
  const listeners = new Set<() => void>()
  let active: { token: symbol; sessionId: SessionId } | undefined
  let current: SessionId | undefined
  const publish = (next: SessionId | undefined): void => {
    if (next === current) return
    current = next
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => current,
    subscribe: listener => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    activate: sessionId => {
      const token = Symbol()
      active = { token, sessionId }
      publish(sessionId)
      return () => {
        if (active?.token !== token) return
        active = undefined
        publish(undefined)
      }
    },
  }
}
