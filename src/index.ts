/** Host settings registration for the browser-only conversation navigator. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_SETTINGS,
  SETTINGS_ENTRY_ID,
  SETTINGS_LIMITS,
} from './core/config.ts'

export const Config = z.object({
  language: z.union([z.const('zh'), z.const('en'), z.const('zh-TW')]).default(DEFAULT_SETTINGS.language).volatile(),
  enabled: z.boolean().default(DEFAULT_SETTINGS.enabled).volatile(),
  keyHeight: z.natural().min(SETTINGS_LIMITS.keyHeight.min).max(SETTINGS_LIMITS.keyHeight.max).step(1).default(DEFAULT_SETTINGS.keyHeight).volatile(),
  keyGap: z.natural().min(SETTINGS_LIMITS.keyGap.min).max(SETTINGS_LIMITS.keyGap.max).step(1).default(DEFAULT_SETTINGS.keyGap).volatile(),
  maxVisible: z.natural().min(SETTINGS_LIMITS.maxVisible.min).max(SETTINGS_LIMITS.maxVisible.max).step(1).default(DEFAULT_SETTINGS.maxVisible).volatile(),
})

export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(
      () => settingsCtx.settings.configure({ auto: false }, ctx.fiber),
      `sm-context-piano:${SETTINGS_ENTRY_ID}: custom settings page`,
    )
  })
}
