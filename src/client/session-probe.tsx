import { useLayoutEffect } from 'react'
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'

interface SessionProbeInjected {
  activate: (sessionId: SessionId) => () => void
}

export type SessionProbeProps =
  PropsRuntime<'conversation.session.header.actions'>
  & InjectFace<SessionProbeInjected>

/** Report the active Session through DSH's session-scoped slot lifecycle. */
export function SessionProbe({ sessionId, activate }: SessionProbeProps): null {
  useLayoutEffect(() => activate(sessionId), [activate, sessionId])
  return null
}
