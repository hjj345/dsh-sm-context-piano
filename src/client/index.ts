/**
 * sm-context-piano — browser half: registers the dictionary, injects the
 * navigator stylesheet, and attaches the paragraph-navigator strip to the
 * chat flow; a session-scoped header action tracks which conversation is active.
 * Everything rides ctx.effect, so plugin unload removes the strip, the
 * observers, the styles, and the dictionaries together.
 *
 * Failure policy: every DOM/runtime wiring failure is logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws.
 * @module dsh-sm-context-piano/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { NS, dictionaries } from './locales.ts'
import {
  PianoSettingsPage,
  createPianoSettingsSource,
} from './settings-page.tsx'
import { installStyles } from './styles.ts'
import { attachKeyStrip } from './strip.ts'
import { createCurrentSessionSource } from './chat-source.ts'
import { SessionProbe } from './session-probe.tsx'

/** Required services for the conversation surface and profile settings remote. */
export const inject = ['sessions', 'uiConversation', 'locale', 'slots', 'remote', 'remote.settings']

/** Apply the browser half. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-sm-context-piano: dictionaries')
  ctx.effect(() => installStyles(), 'dsh-sm-context-piano: styles')

  const t = ctx.locale.bind(NS)
  const selectedSession = createCurrentSessionSource()
  const settings = createPianoSettingsSource(ctx.remote)
  ctx.effect(() => () => settings.dispose(), 'dsh-sm-context-piano: settings remote')

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'sm-context-piano-session-probe',
    inject: () => ({ activate: selectedSession.activate }),
  }, SessionProbe))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'sm-context-piano',
    order: 21,
    label: () => t('settings.nav'),
    inject: () => ({ scope: settings.scope }),
  }, PianoSettingsPage))

  ctx.effect(() => attachKeyStrip(ctx, t, selectedSession, settings.source), 'dsh-sm-context-piano: navigator strip')
}
