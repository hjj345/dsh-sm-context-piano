/** Host settings registration for the browser-only conversation navigator. */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_SETTINGS,
  SETTINGS_NAMESPACE,
  validateSettings,
} from './core/config.ts'

const PianoSettingsSchema = z.object({
  enabled: z.boolean().default(DEFAULT_SETTINGS.enabled),
  keyHeight: z.number().default(DEFAULT_SETTINGS.keyHeight),
  keyGap: z.number().default(DEFAULT_SETTINGS.keyGap),
  maxVisible: z.number().default(DEFAULT_SETTINGS.maxVisible),
})

export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(SETTINGS_NAMESPACE),
      PianoSettingsSchema,
      { applies: 'live', validate: validateSettings },
    )
  })
}
