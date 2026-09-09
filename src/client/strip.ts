/** Fixed-window Codex-style navigator for user and visible assistant output. */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatNavigationNode, ChatSnapshot } from './chat-source.ts'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { buildNavigationNodes } from './keys.ts'
import type { KeyDescriptor } from './keys.ts'
import { updateTooltip } from './tooltip.ts'
import type { SmContextPianoKey } from './locales.ts'
import {
  DEFAULT_SETTINGS,
  DEFAULT_SETTINGS_SOURCE,
  railHeight,
} from '../core/config.ts'
import type { PianoSettingsSource } from '../core/config.ts'

const FLOW_SELECTOR = '[data-chat-flow]'
const SCROLL_SELECTOR = '[data-conversation-scroll]'
const ROW_SELECTOR = '[data-chat-anchor-key]'
const OWNER_SELECTOR = '[data-smcp-owner="hjj345345"]'
const OFFICIAL_NAV_SELECTOR = 'nav[aria-label]'
const DIALOG_SELECTOR = '[role="dialog"]'
const SETTINGS_SECTION_SELECTOR = '[data-slot="settings.section"]'

function findConversationFlow(): HTMLElement | null {
  const direct = document.querySelector<HTMLElement>(FLOW_SELECTOR)
  if (direct !== null) return direct
  for (const scrollport of document.querySelectorAll<HTMLElement>(SCROLL_SELECTOR)) {
    if (scrollport.querySelector(ROW_SELECTOR) !== null) return scrollport
  }
  return null
}

function isOfficialTurnNavigator(nav: HTMLElement): boolean {
  const label = nav.getAttribute('aria-label')?.trim().toLowerCase()
  if (label === '轮次导航' || label === '輪次導覽' || label === 'turn navigation') return true
  return nav.querySelector('[aria-label*="跳转到第"], [aria-label*="jump to round"]') !== null
}

function suppressOfficialTurnNavigator(): void {
  for (const nav of document.querySelectorAll<HTMLElement>(OFFICIAL_NAV_SELECTOR)) {
    if (!isOfficialTurnNavigator(nav)) continue
    const slot = nav.parentElement
    if (slot === null || slot.dataset.smcpOfficialSuppressed === 'true') continue
    slot.dataset.smcpOfficialSuppressed = 'true'
    slot.dataset.smcpPreviousDisplay = slot.style.display
    slot.style.display = 'none'
  }
}

function restoreOfficialTurnNavigator(): void {
  for (const slot of document.querySelectorAll<HTMLElement>('[data-smcp-official-suppressed="true"]')) {
    slot.style.display = slot.dataset.smcpPreviousDisplay ?? ''
    delete slot.dataset.smcpOfficialSuppressed
    delete slot.dataset.smcpPreviousDisplay
  }
}

function isHiddenElement(element: HTMLElement): boolean {
  for (let current: HTMLElement | null = element; current !== null; current = current.parentElement) {
    if (current.hidden || current.getAttribute('aria-hidden')?.toLowerCase() === 'true') return true
    const style = window.getComputedStyle(current)
    const opacity = Number.parseFloat(style.opacity)
    if (style.display === 'none' || style.visibility === 'hidden' || (Number.isFinite(opacity) && opacity === 0)) return true
  }
  return false
}

function hasVisibleDialog(): boolean {
  for (const dialog of document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)) {
    if (isHiddenElement(dialog)) continue
    if (dialog.querySelector(SETTINGS_SECTION_SELECTOR) !== null) return true
    const rect = dialog.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return true
  }
  return false
}

const RAIL_TO_FLOW = 108
const RAIL_WIDTH = 58
const RAIL_EDGE_LEFT = 24
const TOOLTIP_GAP = 6
const BASE_WIDTH = 10
const CURRENT_WIDTH = 24
const HOVER_WIDTH = 48
const BIND_RETRY_MS = 300
const BIND_RETRY_MAX = 20

interface Marker {
  el: HTMLButtonElement
  descriptor: KeyDescriptor
  row: HTMLElement | null
  contentY: number
  y: number
}

interface DebugState {
  mounted: boolean
  bars: number
  total: number
  windowStart: number
  sessionId: string | undefined
  hiddenReason: 'empty' | null
}

export function visibleWindow(total: number, center: number, size = DEFAULT_SETTINGS.maxVisible): { start: number; end: number } {
  if (total <= 0 || size <= 0) return { start: 0, end: 0 }
  const count = Math.min(total, size)
  const start = Math.max(0, Math.min(total - count, center - Math.floor(count / 2)))
  return { start, end: start + count }
}

/** Rail left offset from the conversation root, based on the message column. */
export function railLeftOf(contentLeft: number, rootLeft = 0): number {
  const flowLeft = contentLeft - rootLeft
  const gap = Math.max(16, Math.min(flowLeft - RAIL_TO_FLOW, RAIL_EDGE_LEFT))
  return Math.max(16, flowLeft - RAIL_WIDTH - gap)
}

export function stackPositions(
  count: number,
  height = railHeight(DEFAULT_SETTINGS),
  pitch = DEFAULT_SETTINGS.keyGap,
  markHeight = DEFAULT_SETTINGS.keyHeight,
): number[] {
  if (count <= 0) return []
  const stackHeight = (count - 1) * pitch + markHeight
  const top = (height - stackHeight) / 2 + markHeight / 2
  return Array.from({ length: count }, (_, index) => top + index * pitch)
}

export function attachKeyStrip(
  ctx: ClientContext,
  t: Translate<SmContextPianoKey>,
  settings: PianoSettingsSource = DEFAULT_SETTINGS_SOURCE,
): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || document.body === null) return () => {}

  let disposed = false
  let mountedFlow: HTMLElement | null = null
  let disposeMount: (() => void) | undefined
  let reconcileFrame = 0

  const reconcile = (): void => {
    reconcileFrame = 0
    if (disposed) return
    if (!settings.getSnapshot().enabled) {
      disposeMount?.()
      disposeMount = undefined
      mountedFlow = null
      return
    }
    const nextFlow = findConversationFlow()
    if (nextFlow === mountedFlow && nextFlow?.isConnected && document.querySelector(OWNER_SELECTOR) !== null) return
    disposeMount?.()
    disposeMount = undefined
    mountedFlow = nextFlow
    if (nextFlow !== null) {
      try {
        disposeMount = mountStrip(ctx, nextFlow, t, settings)
      } catch (error) {
        console.warn('[dsh-sm-context-piano] navigator mount failed:', error)
      }
    }
  }

  const scheduleReconcile = (): void => {
    if (
      disposed
      || reconcileFrame !== 0
      || !settings.getSnapshot().enabled
      || (mountedFlow?.isConnected && document.querySelector(OWNER_SELECTOR) !== null)
    ) return
    reconcileFrame = window.requestAnimationFrame(reconcile)
  }

  let observer: MutationObserver
  try {
    observer = new MutationObserver(scheduleReconcile)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-chat-flow', 'data-chat-anchor-key'],
      childList: true,
      subtree: true,
    })
  } catch (error) {
    console.warn('[dsh-sm-context-piano] navigator watcher unavailable:', error)
    return () => {}
  }
  const settingsUnsub = settings.subscribe(() => {
    if (!settings.getSnapshot().enabled) {
      disposeMount?.()
      disposeMount = undefined
      mountedFlow = null
    } else {
      scheduleReconcile()
    }
  })
  reconcile()

  return () => {
    disposed = true
    settingsUnsub()
    observer.disconnect()
    if (reconcileFrame !== 0) window.cancelAnimationFrame(reconcileFrame)
    disposeMount?.()
  }
}

function mountStrip(
  ctx: ClientContext,
  flow: HTMLElement,
  t: Translate<SmContextPianoKey>,
  settings: PianoSettingsSource,
): () => void {
  const scrollport = flow.closest<HTMLElement>(SCROLL_SELECTOR) ?? flow.parentElement
  const root = scrollport?.parentElement
  if (scrollport === null || scrollport === undefined || root === null || root === undefined) return () => {}

  const overlay = document.createElement('div')
  overlay.className = 'smcp-overlay'
  overlay.dataset.smcpOwner = 'hjj345345'
  const strip = document.createElement('div')
  strip.className = 'smcp-strip'
  strip.dataset.smcpOwner = 'hjj345345'
  strip.tabIndex = 0
  strip.setAttribute('role', 'navigation')
  strip.setAttribute('aria-label', t('nav.aria'))
  const tooltip = document.createElement('div')
  tooltip.className = 'smcp-tooltip'
  tooltip.setAttribute('aria-hidden', 'true')

  overlay.append(strip, tooltip)
  document.body.append(overlay)

  const debug: DebugState = {
    mounted: true,
    bars: 0,
    total: 0,
    windowStart: 0,
    sessionId: undefined,
    hiddenReason: 'empty',
  }
  const debugTarget = globalThis as unknown as { __smcpDebug?: DebugState }
  debugTarget.__smcpDebug = debug

  let alive = true
  let markers: Marker[] = []
  let sessionId: SessionId | undefined
  let sessionUnsub: (() => void) | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let retryCount = 0
  let layoutFrame = 0
  let pointerFrame = 0
  let scrollFrame = 0
  let latestPointerY: number | null = null
  let hoverKey: string | null = null
  let currentKey: string | null = null
  let railLeft = 0
  let chatSource: { getSnapshot: () => ChatSnapshot | undefined; subscribe: (listener: () => void) => () => void } | undefined
  let officialNavObserver: MutationObserver | undefined

  const markerByKey = (key: string | null): Marker | null => key === null
    ? null
    : markers.find(marker => marker.descriptor.key === key) ?? null

  const baseWidth = (marker: Marker): number => marker.descriptor.key === currentKey ? CURRENT_WIDTH : BASE_WIDTH

  const markerLocalY = (marker: Marker, stripRect = strip.getBoundingClientRect()): number => {
    const rect = marker.el.getBoundingClientRect()
    return rect.height > 0 ? rect.top - stripRect.top + rect.height / 2 : marker.y
  }

  const paintWidths = (pointerY: number | null): void => {
    const visible = markers.filter(marker => marker.row !== null && !marker.el.hidden)
    const sigma = settings.getSnapshot().keyGap * 1.35
    const divisor = 2 * sigma * sigma
    const stripRect = strip.getBoundingClientRect()
    for (const marker of visible) {
      const base = baseWidth(marker)
      const falloff = pointerY === null ? 0 : Math.exp(-((pointerY - markerLocalY(marker, stripRect)) ** 2) / divisor)
      const max = marker.descriptor.key === currentKey ? HOVER_WIDTH + 4 : HOVER_WIDTH
      marker.el.style.width = `${(base + (max - base) * falloff).toFixed(1)}px`
    }
  }

  const positionTooltip = (marker: Marker): void => {
    const stripRect = strip.getBoundingClientRect()
    const markerRect = marker.el.getBoundingClientRect()
    const markerY = markerRect.height > 0 ? markerRect.top + markerRect.height / 2 : stripRect.top + marker.y
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const tooltipWidth = tooltip.offsetWidth || Math.min(560, Math.max(280, viewportWidth - 32))
    const tooltipHeight = tooltip.offsetHeight || 100
    const preferredLeft = stripRect.right + TOOLTIP_GAP
    const left = preferredLeft + tooltipWidth <= viewportWidth - 8 ? preferredLeft : Math.max(8, stripRect.left - tooltipWidth - 10)
    const top = Math.max(8, Math.min(markerY - tooltipHeight / 2, viewportHeight - tooltipHeight - 8))
    tooltip.style.left = `${left.toFixed(1)}px`
    tooltip.style.top = `${top.toFixed(1)}px`
  }

  const onStripTransitionEnd = (event: TransitionEvent): void => {
    if (event.propertyName !== 'left') return
    const hovered = markerByKey(hoverKey)
    if (hovered !== null) positionTooltip(hovered)
  }

  const setHover = (marker: Marker | null): void => {
    const key = marker?.descriptor.key ?? null
    if (key === hoverKey) return
    hoverKey = key
    for (const item of markers) item.el.classList.toggle('smcp-bar-hover', item.descriptor.key === key)
    if (marker === null) {
      tooltip.classList.remove('smcp-tooltip-visible')
      tooltip.setAttribute('aria-hidden', 'true')
      return
    }
    updateTooltip(tooltip, marker.descriptor)
    tooltip.classList.add('smcp-tooltip-visible')
    tooltip.setAttribute('aria-hidden', 'false')
    window.requestAnimationFrame(() => {
      if (alive && hoverKey === marker.descriptor.key) positionTooltip(marker)
    })
  }

  const setCurrent = (key: string | null): boolean => {
    if (key === currentKey) return false
    currentKey = key
    for (const marker of markers) marker.el.classList.toggle('smcp-bar-current', marker.descriptor.key === key)
    paintWidths(latestPointerY)
    return true
  }

  const updateCurrent = (): boolean => {
    const anchored = markers.filter(marker => marker.row !== null).sort((a, b) => a.contentY - b.contentY)
    if (anchored.length === 0) return setCurrent(null)
    const readingLine = scrollport.scrollTop + Math.min(120, scrollport.clientHeight * 0.18)
    let low = 0
    let high = anchored.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (anchored[middle].contentY <= readingLine) low = middle
      else high = middle - 1
    }
    return setCurrent(anchored[low].descriptor.key)
  }

  const measureLayout = (): void => {
    layoutFrame = 0
    if (!alive || !strip.isConnected) return

    const rootRect = root.getBoundingClientRect()
    const flowRect = flow.getBoundingClientRect()
    const rootHeight = root.clientHeight || rootRect.height
    const rootWidth = root.clientWidth || rootRect.width
    const messageLefts = [...flow.querySelectorAll<HTMLElement>(ROW_SELECTOR)]
      .map(row => row.getBoundingClientRect())
      .filter(rect => rect.width > 0 && Number.isFinite(rect.left))
      .map(rect => rect.left)
    const measuredContentLeft = messageLefts.length > 0 ? Math.min(...messageLefts) : flowRect.left
    const measuredFlowLeft = measuredContentLeft - rootRect.left
    const flowLeft = Number.isFinite(measuredFlowLeft) && flowRect.width > 0
      ? measuredFlowLeft
      : Math.max(96, (rootWidth - Math.min(760, rootWidth)) / 2)
    railLeft = railLeftOf(rootRect.left + flowLeft, rootRect.left)
    const config = settings.getSnapshot()
    const height = railHeight(config)
    strip.style.left = `${(rootRect.left + railLeft).toFixed(1)}px`
    strip.style.top = `${(rootRect.top + rootHeight / 2).toFixed(1)}px`
    strip.style.height = `${height}px`

    const rows = new Map<string, HTMLElement>()
    for (const row of flow.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
      const key = row.dataset.chatAnchorKey
      if (key !== undefined) rows.set(key, row)
    }
    const scrollRect = scrollport.getBoundingClientRect()
    for (const marker of markers) {
      marker.row = rows.get(marker.descriptor.anchorKey) ?? null
      marker.el.hidden = true
      if (marker.row !== null) {
        marker.contentY = marker.row.getBoundingClientRect().top - scrollRect.top + scrollport.scrollTop
      }
    }

    updateCurrent()
    const anchored = markers.filter(marker => marker.row !== null).sort((a, b) => a.contentY - b.contentY)
    const currentIndex = Math.max(0, anchored.findIndex(marker => marker.descriptor.key === currentKey))
    const windowRange = visibleWindow(anchored.length, currentIndex, config.maxVisible)
    const visible = anchored.slice(windowRange.start, windowRange.end)
    const positions = stackPositions(visible.length, height, config.keyGap, config.keyHeight)
    for (let index = 0; index < visible.length; index += 1) {
      const marker = visible[index]
      marker.y = positions[index]
      marker.el.hidden = false
      marker.el.style.top = `${(marker.y - config.keyHeight / 2).toFixed(1)}px`
      marker.el.style.height = `${config.keyHeight}px`
    }

    debug.hiddenReason = visible.length === 0 ? 'empty' : null
    if (debug.hiddenReason === null) suppressOfficialTurnNavigator()
    else restoreOfficialTurnNavigator()
    strip.classList.toggle('smcp-strip-hidden', debug.hiddenReason !== null)
    if (debug.hiddenReason !== null || markerByKey(hoverKey)?.el.hidden) {
      latestPointerY = null
      setHover(null)
    }
    debug.bars = visible.length
    debug.total = anchored.length
    debug.windowStart = windowRange.start
    paintWidths(latestPointerY)
    const hovered = markerByKey(hoverKey)
    if (hovered !== null) positionTooltip(hovered)
  }

  const scheduleLayout = (): void => {
    if (!alive || layoutFrame !== 0) return
    layoutFrame = window.requestAnimationFrame(measureLayout)
  }

  const reconcileMarkers = (descriptors: readonly KeyDescriptor[]): void => {
    const existing = new Map(markers.map(marker => [marker.descriptor.key, marker]))
    const next: Marker[] = []
    for (const descriptor of descriptors) {
      let marker = existing.get(descriptor.key)
      if (marker === undefined) {
        const el = document.createElement('button')
        el.type = 'button'
        el.tabIndex = -1
        el.className = 'smcp-bar'
        el.dataset.key = descriptor.key
        marker = { el, descriptor, row: null, contentY: 0, y: 0 }
      } else {
        existing.delete(descriptor.key)
        marker.descriptor = descriptor
      }
      marker.el.setAttribute('aria-label', descriptor.title)
      strip.appendChild(marker.el)
      next.push(marker)
    }
    for (const marker of existing.values()) marker.el.remove()
    markers = next
    const hovered = markerByKey(hoverKey)
    if (hovered === null) setHover(null)
    else updateTooltip(tooltip, hovered.descriptor)
    scheduleLayout()
  }

  const rebuild = (): void => {
    if (!alive || sessionId === undefined) return
    const snapshot = chatSource?.getSnapshot()
    if (snapshot === undefined) {
      reconcileMarkers([])
      return
    }
    const nodes = snapshot.order
      .map(key => snapshot.nodes.get(key))
      .filter((node): node is ChatNavigationNode => node !== undefined)
    reconcileMarkers(buildNavigationNodes(nodes))
  }

  const bindSession = (): void => {
    if (!alive) return
    const nextId = ctx.sessions.list.getSnapshot().current
    if (nextId !== sessionId) {
      sessionUnsub?.()
      sessionUnsub = undefined
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
      retryTimer = undefined
      retryCount = 0
      sessionId = nextId
      chatSource = undefined
      debug.sessionId = nextId === undefined ? undefined : String(nextId)
      reconcileMarkers([])
    }
    if (sessionId === undefined || sessionUnsub !== undefined) return
    try {
      chatSource = ctx.uiConversation.binding(sessionId).target('chat')
    } catch (error) {
      if (retryCount < BIND_RETRY_MAX) {
        retryCount += 1
        retryTimer = window.setTimeout(bindSession, BIND_RETRY_MS)
      } else {
        console.warn('[dsh-sm-context-piano] chat target unavailable:', String(error))
      }
      return
    }
    retryCount = 0
    retryTimer = undefined
    const source = chatSource
    if (source === undefined) return
    sessionUnsub = source.subscribe(rebuild)
    rebuild()
  }

  const nearestMarker = (localY: number): Marker | null => {
    const visible = markers.filter(marker => marker.row !== null && !marker.el.hidden)
    if (visible.length === 0) return null
    const stripRect = strip.getBoundingClientRect()
    const centers = visible.map(marker => markerLocalY(marker, stripRect))
    const halfGap = settings.getSnapshot().keyGap / 2
    if (localY < centers[0] - halfGap || localY > centers[centers.length - 1] + halfGap) return null
    let nearest: Marker | null = null
    let distance = Number.POSITIVE_INFINITY
    for (let index = 0; index < visible.length; index += 1) {
      const marker = visible[index]
      const candidate = Math.abs(localY - centers[index])
      if (candidate < distance) {
        nearest = marker
        distance = candidate
      }
    }
    return nearest
  }

  const onPointerMove = (event: PointerEvent): void => {
    latestPointerY = event.clientY - strip.getBoundingClientRect().top
    if (pointerFrame !== 0) return
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0
      if (!alive || latestPointerY === null) return
      setHover(nearestMarker(latestPointerY))
      paintWidths(latestPointerY)
    })
  }

  const clearInteraction = (): void => {
    latestPointerY = null
    setHover(null)
    paintWidths(null)
  }

  const syncOverlayVisibility = (): void => {
    const suspended = hasVisibleDialog()
    if (overlay.hidden === suspended) return
    overlay.hidden = suspended
    if (suspended) clearInteraction()
    else scheduleLayout()
  }

  const jumpTo = (marker: Marker | null): void => {
    if (marker === null || marker.row === null) return
    setCurrent(marker.descriptor.key)
    scheduleLayout()
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    scrollport.scrollTo({ top: Math.max(0, marker.contentY - 16), behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const onClick = (event: MouseEvent): void => {
    const key = (event.target as HTMLElement).closest<HTMLElement>('.smcp-bar')?.dataset.key ?? hoverKey
    const localY = event.clientY - strip.getBoundingClientRect().top
    jumpTo(markerByKey(key ?? null) ?? nearestMarker(localY))
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    const visible = markers.filter(marker => marker.row !== null && !marker.el.hidden).sort((a, b) => a.y - b.y)
    if (visible.length === 0) return
    if (event.key === 'Escape') {
      clearInteraction()
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      jumpTo(markerByKey(hoverKey) ?? markerByKey(currentKey) ?? visible[0])
      return
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const selected = markerByKey(hoverKey) ?? markerByKey(currentKey)
    const currentIndex = Math.max(0, visible.indexOf(selected ?? visible[0]))
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? visible.length - 1
        : Math.max(0, Math.min(visible.length - 1, currentIndex + (event.key === 'ArrowDown' ? 1 : -1)))
    const next = visible[nextIndex]
    latestPointerY = markerLocalY(next)
    setHover(next)
    paintWidths(next.y)
  }

  const onScroll = (): void => {
    if (scrollFrame !== 0) return
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0
      if (alive && updateCurrent()) scheduleLayout()
    })
  }

  const flowObserver = new MutationObserver(scheduleLayout)
  flowObserver.observe(flow, { childList: true })
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleLayout)
  resizeObserver?.observe(root)
  resizeObserver?.observe(scrollport)
  resizeObserver?.observe(flow)
  officialNavObserver = new MutationObserver(records => {
    const externalMutation = records.some(record => {
      const target = record.target
      return !(target.nodeType === 1 && (target as Element).closest(OWNER_SELECTOR) !== null)
    })
    if (!externalMutation) return
    syncOverlayVisibility()
    if (debug.hiddenReason === null) suppressOfficialTurnNavigator()
  })
  officialNavObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-label', 'aria-hidden', 'class', 'data-slot', 'data-state', 'hidden', 'role', 'style'],
    childList: true,
    subtree: true,
  })
  syncOverlayVisibility()
  strip.addEventListener('pointermove', onPointerMove)
  strip.addEventListener('pointerleave', clearInteraction)
  strip.addEventListener('click', onClick)
  strip.addEventListener('keydown', onKeyDown)
  strip.addEventListener('blur', clearInteraction)
  strip.addEventListener('transitionend', onStripTransitionEnd)
  scrollport.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', scheduleLayout)
  const listUnsub = ctx.sessions.list.subscribe(bindSession)
  const settingsUnsub = settings.subscribe(scheduleLayout)

  bindSession()
  scheduleLayout()

  return () => {
    alive = false
    listUnsub()
    settingsUnsub()
    sessionUnsub?.()
    officialNavObserver?.disconnect()
    restoreOfficialTurnNavigator()
    flowObserver.disconnect()
    resizeObserver?.disconnect()
    strip.removeEventListener('pointermove', onPointerMove)
    strip.removeEventListener('pointerleave', clearInteraction)
    strip.removeEventListener('click', onClick)
    strip.removeEventListener('keydown', onKeyDown)
    strip.removeEventListener('blur', clearInteraction)
    strip.removeEventListener('transitionend', onStripTransitionEnd)
    scrollport.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', scheduleLayout)
    if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    if (layoutFrame !== 0) window.cancelAnimationFrame(layoutFrame)
    if (pointerFrame !== 0) window.cancelAnimationFrame(pointerFrame)
    if (scrollFrame !== 0) window.cancelAnimationFrame(scrollFrame)
    overlay.remove()
    chatSource = undefined
    if (debugTarget.__smcpDebug === debug) debugTarget.__smcpDebug = undefined
  }
}
