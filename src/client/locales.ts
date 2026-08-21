/** Locale copy for the navigator and its first-level settings page. */

import type { PianoLanguage } from '../core/config.ts'

const zh = {
  'nav.aria': '对话段落快速导航',
  'settings.nav': '琴键导航',
  'settings.subtitle': '控制对话琴键导航的显示与布局。',
  'settings.general': '通用设置',
  'settings.enabled': '已启用',
  'settings.disabled': '已关闭',
  'settings.appearance': '显示设置',
  'settings.height': '琴键粗细',
  'settings.heightDesc': '调整每根琴键横条的高度。',
  'settings.gap': '琴键间距',
  'settings.gapDesc': '调整相邻琴键中心点之间的距离。',
  'settings.maxVisible': '最大显示数量',
  'settings.maxVisibleDesc': '限制琴键窗口同时显示的节点数量。',
  'settings.totalHeight': '自动计算的轨道高度',
  'settings.reset': '恢复默认值',
  'settings.loading': '正在读取设置…',
  'settings.unavailable': '当前连接无法持久化设置，正在使用默认值。',
  'settings.writeError': '设置保存失败，请稍后重试。',
  'settings.about': '关于插件',
  'settings.version': '版本',
  'settings.releaseDate': '发布日期',
  'settings.author': '作者',
  'settings.email': '邮箱',
  'settings.unpublished': '待公布',
  'settings.install': '安装命令',
  'settings.copy': '复制',
  'settings.copied': '已复制',
  'settings.copyError': '复制失败，请手动选择命令。',
} as const

const en: Record<keyof typeof zh, string> = {
  'nav.aria': 'Conversation paragraph navigator',
  'settings.nav': 'sm-context-piano',
  'settings.subtitle': 'Control the conversation key navigator and its layout.',
  'settings.general': 'General settings',
  'settings.enabled': 'Enabled',
  'settings.disabled': 'Disabled',
  'settings.appearance': 'Display',
  'settings.height': 'Key thickness',
  'settings.heightDesc': 'Adjust the height of each horizontal key.',
  'settings.gap': 'Key spacing',
  'settings.gapDesc': 'Adjust the distance between adjacent key centers.',
  'settings.maxVisible': 'Maximum visible keys',
  'settings.maxVisibleDesc': 'Limit how many nodes the key window shows at once.',
  'settings.totalHeight': 'Calculated rail height',
  'settings.reset': 'Restore defaults',
  'settings.loading': 'Loading settings…',
  'settings.unavailable': 'This connection cannot persist settings. Defaults are active.',
  'settings.writeError': 'Could not save the setting. Try again.',
  'settings.about': 'About',
  'settings.version': 'Version',
  'settings.releaseDate': 'Release date',
  'settings.author': 'Author',
  'settings.email': 'Email',
  'settings.unpublished': 'To be announced',
  'settings.install': 'Install command',
  'settings.copy': 'Copy',
  'settings.copied': 'Copied',
  'settings.copyError': 'Copy failed. Select the command manually.',
}

const zhTW: Record<keyof typeof zh, string> = {
  'nav.aria': '對話段落快速導覽',
  'settings.nav': '琴鍵導覽',
  'settings.subtitle': '控制對話琴鍵導覽的顯示與版面配置。',
  'settings.general': '通用設定',
  'settings.enabled': '已啟用',
  'settings.disabled': '已關閉',
  'settings.appearance': '顯示設定',
  'settings.height': '琴鍵粗細',
  'settings.heightDesc': '調整每根琴鍵橫條的高度。',
  'settings.gap': '琴鍵間距',
  'settings.gapDesc': '調整相鄰琴鍵中心點之間的距離。',
  'settings.maxVisible': '最大顯示數量',
  'settings.maxVisibleDesc': '限制琴鍵視窗同時顯示的節點數量。',
  'settings.totalHeight': '自動計算的軌道高度',
  'settings.reset': '恢復預設值',
  'settings.loading': '正在讀取設定…',
  'settings.unavailable': '目前連線無法儲存設定，正在使用預設值。',
  'settings.writeError': '設定儲存失敗，請稍後再試。',
  'settings.about': '關於外掛',
  'settings.version': '版本',
  'settings.releaseDate': '發布日期',
  'settings.author': '作者',
  'settings.email': '電子郵件',
  'settings.unpublished': '待公布',
  'settings.install': '安裝命令',
  'settings.copy': '複製',
  'settings.copied': '已複製',
  'settings.copyError': '複製失敗，請手動選取命令。',
}

export type SmContextPianoKey = keyof typeof zh
export const NS = 'sm-context-piano'
export const dictionaries: Record<'zh' | 'en', Record<SmContextPianoKey, string>> = { zh, en }
export const pluginDictionaries: Record<PianoLanguage, Record<SmContextPianoKey, string>> = {
  zh,
  en,
  'zh-TW': zhTW,
}

export function translate(language: PianoLanguage, key: SmContextPianoKey): string {
  return pluginDictionaries[language][key]
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'sm-context-piano': SmContextPianoKey
  }
}
