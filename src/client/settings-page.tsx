import { useCallback, useState, useSyncExternalStore } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import type {
  SettingsScope,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  InjectFace,
  PropsLocale,
  PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import iconUrl from '../../images/sm-context-piano-icon.png'
import {
  DEFAULT_SETTINGS,
  SETTINGS_LIMITS,
  decodeSettings,
  railHeight,
} from '../core/config.ts'
import type {
  PianoSettings,
  PianoSettingsSource,
} from '../core/config.ts'

const VERSION = 'v1.0'
const RELEASE_DATE = '2026-08-19'
const AUTHOR = 'Jack·Huang'
const EMAIL = 'jack698698@gmail.com'
const INSTALL_COMMAND = 'dsh plugin --profile web add @linxin666/dsh-sm-context-piano'

export interface PianoSettingsPageInjected {
  scope: SettingsScope<PianoSettings>
}

export type PianoSettingsPageProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'sm-context-piano'>
  & InjectFace<PianoSettingsPageInjected>

export function createPianoSettingsSource(scope: SettingsScope<PianoSettings>): PianoSettingsSource {
  return {
    getSnapshot: () => decodeSettings(scope.getSnapshot().value) ?? DEFAULT_SETTINGS,
    subscribe: (listener) => scope.subscribe(listener),
  }
}

interface RangeRowProps {
  label: string
  description: string
  value: number
  min: number
  max: number
  suffix: string
  disabled: boolean
  onChange: (value: number) => void
}

function RangeRow(props: RangeRowProps): ReactNode {
  const { label, description, value, min, max, suffix, disabled, onChange } = props
  const change = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(Number.parseInt(event.target.value, 10))
  }
  return (
    <label className="smcp-settings-row">
      <span className="smcp-settings-copy">
        <span className="smcp-settings-label">{label}</span>
        <span className="smcp-settings-description">{description}</span>
      </span>
      <span className="smcp-settings-range">
        <input type="range" min={min} max={max} step={1} value={value} disabled={disabled} onChange={change} />
        <output>{value}{suffix}</output>
      </span>
    </label>
  )
}

export function PianoSettingsPage(props: PianoSettingsPageProps): ReactNode {
  const { scope, t } = props
  const subscribe = useCallback((listener: () => void) => scope.subscribe(listener), [scope])
  const getSnapshot = useCallback(() => scope.getSnapshot(), [scope])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const settings = decodeSettings(snapshot.value) ?? DEFAULT_SETTINGS
  const [error, setError] = useState<string | null>(null)
  const disabled = !snapshot.writable

  const write = (field: keyof PianoSettings, value: boolean | number): void => {
    setError(null)
    void scope.set(field, value).catch(() => { setError(t('settings.writeError')) })
  }
  const reset = (): void => {
    setError(null)
    void (async () => {
      try {
        for (const field of ['enabled', 'keyHeight', 'keyGap', 'maxVisible'] as const) {
          await scope.unset(field)
        }
      } catch {
        setError(t('settings.writeError'))
      }
    })()
  }

  return (
    <div className="smcp-settings-page">
      <section className="smcp-settings-hero">
        <img src={iconUrl} alt="" className="smcp-settings-icon" />
        <span className="smcp-settings-hero-copy">
          <span className="smcp-settings-title">sm-context-piano</span>
          <span className="smcp-settings-subtitle">{t('settings.subtitle')}</span>
        </span>
        <label className="smcp-settings-switch">
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={disabled}
            onChange={(event) => { write('enabled', event.target.checked) }}
          />
          <span aria-hidden="true" />
          <b>{settings.enabled ? t('settings.enabled') : t('settings.disabled')}</b>
        </label>
      </section>

      <section className="smcp-settings-card">
        <h2>{t('settings.appearance')}</h2>
        <RangeRow
          label={t('settings.height')}
          description={t('settings.heightDesc')}
          value={settings.keyHeight}
          min={SETTINGS_LIMITS.keyHeight.min}
          max={SETTINGS_LIMITS.keyHeight.max}
          suffix="px"
          disabled={disabled}
          onChange={(value) => { write('keyHeight', value) }}
        />
        <RangeRow
          label={t('settings.gap')}
          description={t('settings.gapDesc')}
          value={settings.keyGap}
          min={SETTINGS_LIMITS.keyGap.min}
          max={SETTINGS_LIMITS.keyGap.max}
          suffix="px"
          disabled={disabled}
          onChange={(value) => { write('keyGap', value) }}
        />
        <RangeRow
          label={t('settings.maxVisible')}
          description={t('settings.maxVisibleDesc')}
          value={settings.maxVisible}
          min={SETTINGS_LIMITS.maxVisible.min}
          max={SETTINGS_LIMITS.maxVisible.max}
          suffix=""
          disabled={disabled}
          onChange={(value) => { write('maxVisible', value) }}
        />
        <div className="smcp-settings-total">
          <span>{t('settings.totalHeight')}</span>
          <strong>{railHeight(settings)}px</strong>
        </div>
        <button type="button" className="smcp-settings-reset" disabled={disabled} onClick={reset}>
          {t('settings.reset')}
        </button>
        {snapshot.status === 'loading' && <p className="smcp-settings-note">{t('settings.loading')}</p>}
        {snapshot.status === 'unavailable' && <p className="smcp-settings-note">{t('settings.unavailable')}</p>}
        {error !== null && <p className="smcp-settings-error">{error}</p>}
      </section>

      <section className="smcp-settings-card smcp-settings-about">
        <h2>{t('settings.about')}</h2>
        <dl>
          <div><dt>{t('settings.version')}</dt><dd>{VERSION}</dd></div>
          <div><dt>{t('settings.releaseDate')}</dt><dd>{RELEASE_DATE}</dd></div>
          <div><dt>{t('settings.author')}</dt><dd>{AUTHOR}</dd></div>
          <div><dt>{t('settings.email')}</dt><dd><a href={`mailto:${EMAIL}`}>{EMAIL}</a></dd></div>
          <div><dt>GitHub</dt><dd>{t('settings.unpublished')}</dd></div>
        </dl>
        <div className="smcp-settings-command">
          <span>{t('settings.install')}</span>
          <code>{INSTALL_COMMAND}</code>
        </div>
      </section>
    </div>
  )
}
