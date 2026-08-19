/** Locale copy for the navigator and its first-level settings page. */

const zh = {
  'nav.aria': '对话段落快速导航',
  'settings.nav': '琴键导航',
  'settings.subtitle': '控制对话琴键导航的显示与布局。',
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
} as const

const en: Record<keyof typeof zh, string> = {
  'nav.aria': 'Conversation paragraph navigator',
  'settings.nav': 'sm-context-piano',
  'settings.subtitle': 'Control the conversation key navigator and its layout.',
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
}

export type SmContextPianoKey = keyof typeof zh
export const NS = 'sm-context-piano'
export const dictionaries: Record<'zh' | 'en', Record<SmContextPianoKey, string>> = { zh, en }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'sm-context-piano': SmContextPianoKey
  }
}
