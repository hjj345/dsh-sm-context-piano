/** Codex-style plain-text hover preview. */

import type { KeyDescriptor } from './keys.ts'

/** Rebuild the preview safely; page/session data never crosses innerHTML. */
export function updateTooltip(tooltip: HTMLElement, descriptor: KeyDescriptor): void {
  tooltip.textContent = ''

  const title = document.createElement('strong')
  title.className = 'smcp-tooltip-title'
  title.textContent = descriptor.title
  tooltip.appendChild(title)

  const firstBreak = descriptor.preview.indexOf('\n')
  const remainder = firstBreak < 0 ? '' : descriptor.preview.slice(firstBreak + 1).trim()
  if (remainder !== '') {
    const body = document.createElement('div')
    body.className = 'smcp-tooltip-body'
    body.textContent = remainder
    tooltip.appendChild(body)
  }
}
