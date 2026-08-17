/** Minimal locale surface for the browser-only navigator. */

const zh = { 'nav.aria': '对话段落快速导航' } as const
const en: Record<keyof typeof zh, string> = { 'nav.aria': 'Conversation paragraph navigator' }

export type SmContextPianoKey = keyof typeof zh
export const NS = 'sm-context-piano'
export const dictionaries: Record<'zh' | 'en', Record<SmContextPianoKey, string>> = { zh, en }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'sm-context-piano': SmContextPianoKey
  }
}
