/**
 * sm-context-piano — browser half: registers the dictionary, injects the
 * navigator stylesheet, and attaches the paragraph-navigator strip to the
 * chat flow (sentinel pattern: no slot seats taken, no dsh source changes).
 * Everything rides ctx.effect, so plugin unload removes the strip, the
 * observers, the styles, and the dictionaries together.
 *
 * Failure policy: every DOM/runtime wiring failure is logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws.
 * @module dsh-sm-context-piano/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { NS, dictionaries } from './locales.ts'
import { installStyles } from './styles.ts'
import { attachKeyStrip } from './strip.ts'

/** Required services: the session store (active conversation) and the locale service. */
export const inject = ['sessions', 'locale']

/** Apply the browser half. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-sm-context-piano: dictionaries')
  ctx.effect(() => installStyles(), 'dsh-sm-context-piano: styles')

  const t = ctx.locale.bind(NS)
  ctx.effect(() => attachKeyStrip(ctx, t), 'dsh-sm-context-piano: navigator strip')
}
