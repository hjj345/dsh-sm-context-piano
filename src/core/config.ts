/** Shared settings vocabulary for host registration and browser rendering. */

export interface PianoSettings {
  language: PianoLanguage
  enabled: boolean
  keyHeight: number
  keyGap: number
  maxVisible: number
}

export const SETTINGS_NAMESPACE = 'sm-context-piano'
export const PIANO_LANGUAGE_IDS = ['zh', 'en', 'zh-TW'] as const
export type PianoLanguage = typeof PIANO_LANGUAGE_IDS[number]
export const DEFAULT_SETTINGS: PianoSettings = {
  language: 'zh',
  enabled: true,
  keyHeight: 2,
  keyGap: 12,
  maxVisible: 20,
}

export const SETTINGS_LIMITS = {
  keyHeight: { min: 1, max: 4 },
  keyGap: { min: 6, max: 18 },
  maxVisible: { min: 5, max: 30 },
} as const

const integer = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fallback
  return Math.max(min, Math.min(max, value))
}

export function isPianoLanguage(value: unknown): value is PianoLanguage {
  return typeof value === 'string' && PIANO_LANGUAGE_IDS.includes(value as PianoLanguage)
}

export function decodeSettings(value: unknown): PianoSettings | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const source = value as Partial<PianoSettings>
  return {
    language: isPianoLanguage(source.language) ? source.language : DEFAULT_SETTINGS.language,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_SETTINGS.enabled,
    keyHeight: integer(source.keyHeight, DEFAULT_SETTINGS.keyHeight, SETTINGS_LIMITS.keyHeight.min, SETTINGS_LIMITS.keyHeight.max),
    keyGap: integer(source.keyGap, DEFAULT_SETTINGS.keyGap, SETTINGS_LIMITS.keyGap.min, SETTINGS_LIMITS.keyGap.max),
    maxVisible: integer(source.maxVisible, DEFAULT_SETTINGS.maxVisible, SETTINGS_LIMITS.maxVisible.min, SETTINGS_LIMITS.maxVisible.max),
  }
}

export function validateSettings(value: PianoSettings): void {
  const decoded = decodeSettings(value)
  if (
    decoded === undefined
    || decoded.language !== value.language
    || decoded.enabled !== value.enabled
    || decoded.keyHeight !== value.keyHeight
    || decoded.keyGap !== value.keyGap
    || decoded.maxVisible !== value.maxVisible
  ) {
    throw new Error('invalid sm-context-piano settings')
  }
}

export function railHeight(settings: PianoSettings): number {
  return (settings.maxVisible - 1) * settings.keyGap + settings.keyHeight
}

export interface PianoSettingsSource {
  getSnapshot(): PianoSettings
  subscribe(listener: () => void): () => void
}

export const DEFAULT_SETTINGS_SOURCE: PianoSettingsSource = {
  getSnapshot: () => DEFAULT_SETTINGS,
  subscribe: () => () => {},
}
