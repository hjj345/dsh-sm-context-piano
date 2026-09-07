import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'

/** The small Chat target surface consumed by the navigator. */
export interface ChatNavigationNode {
  readonly key: string
  readonly kind: string
  readonly data: unknown
}

export interface ChatSnapshot {
  readonly order: readonly string[]
  readonly nodes: {
    get(key: string): ChatNavigationNode | undefined
  }
}

export interface ChatTarget {
  getSnapshot(): ChatSnapshot | undefined
  subscribe(listener: () => void): () => void
}

export interface UiConversation {
  binding(sessionId: SessionId): {
    target(name: 'chat'): ChatTarget
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    uiConversation: UiConversation
  }
}
