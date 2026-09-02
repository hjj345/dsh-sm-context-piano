/** Host settings registration for the browser-only conversation navigator. */

import type { Context } from '@deepseek-ai/cordis'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_SETTINGS,
  SETTINGS_NAMESPACE,
  validateSettings,
} from './core/config.ts'

const PianoSettingsSchema = z.object({
  language: z.union([z.const('zh'), z.const('en'), z.const('zh-TW')]).default(DEFAULT_SETTINGS.language),
  enabled: z.boolean().default(DEFAULT_SETTINGS.enabled),
  keyHeight: z.number().default(DEFAULT_SETTINGS.keyHeight),
  keyGap: z.number().default(DEFAULT_SETTINGS.keyGap),
  maxVisible: z.number().default(DEFAULT_SETTINGS.maxVisible),
})

export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      SETTINGS_NAMESPACE as SettingsNamespace,
      PianoSettingsSchema,
      { applies: 'live', validate: validateSettings },
    )
  })
}
