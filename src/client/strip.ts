/** Fixed-window Codex-style navigator for user and visible assistant output. */

import type { ChatConversationViewNode, ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { buildNavigationNodes } from './keys.ts'
import type { KeyDescriptor } from './keys.ts'
import { updateTooltip } from './tooltip.ts'
import type { SmContextPianoKey } from './locales.ts'

const FLOW_SELECTOR = '[data-chat-flow]'
const SCROLL_SELECTOR = '[data-conversation-scroll]'
const ROW_SELECTOR = '[data-chat-anchor-key]'
const RAIL_WIDTH = 58
const RAIL_TO_FLOW = 108
const TOOLTIP_GAP = 6
const MIN_ROOT_WIDTH = 520
const MIN_GUTTER = 82
const VISIBLE_KEY_COUNT = 20
const KEY_PITCH = 18
const MARK_HEIGHT = 2
const RAIL_HEIGHT = 346
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
  hiddenReason: 'empty' | 'narrow' | 'overlap' | null
}

export function visibleWindow(total: number, center: number, size = VISIBLE_KEY_COUNT): { start: number; end: number } {
  if (total <= 0 || size <= 0) return { start: 0, end: 0 }
  const count = Math.min(total, size)
  const start = Math.max(0, Math.min(total - count, center - Math.floor(count / 2)))
  return { start, end: start + count }
}

export function stackPositions(count: number, height = RAIL_HEIGHT, pitch = KEY_PITCH): number[] {
  if (count <= 0) return []
  const stackHeight = (count - 1) * pitch + MARK_HEIGHT
  const top = (height - stackHeight) / 2 + MARK_HEIGHT / 2
  return Array.from({ length: count }, (_, index) => top + index * pitch)
}

export function attachKeyStrip(ctx: ClientContext, t: Translate<SmContextPianoKey>): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || document.body === null) return () => {}

  let disposed = false
  let mountedFlow: HTMLElement | null = null
  let disposeMount: (() => void) | undefined
  let reconcileFrame = 0

  const reconcile = (): void => {
    reconcileFrame = 0
    if (disposed) return
    const nextFlow = document.querySelector<HTMLElement>(FLOW_SELECTOR)
    if (nextFlow === mountedFlow && nextFlow?.isConnected) return
    disposeMount?.()
    disposeMount = undefined
    mountedFlow = nextFlow
    if (nextFlow !== null) {
      try {
        disposeMount = mountStrip(ctx, nextFlow, t)
      } catch (error) {
        console.warn('[dsh-sm-context-piano] navigator mount failed:', error)
      }
    }
  }

  const scheduleReconcile = (): void => {
    if (disposed || reconcileFrame !== 0 || mountedFlow?.isConnected) return
    reconcileFrame = window.requestAnimationFrame(reconcile)
  }

  let observer: MutationObserver
  try {
    observer = new MutationObserver(scheduleReconcile)
    observer.observe(document.body, { childList: true, subtree: true })
  } catch (error) {
    console.warn('[dsh-sm-context-piano] navigator watcher unavailable:', error)
    return () => {}
  }
  reconcile()

  return () => {
    disposed = true
    observer.disconnect()
    if (reconcileFrame !== 0) window.cancelAnimationFrame(reconcileFrame)
    disposeMount?.()
  }
}

function mountStrip(ctx: ClientContext, flow: HTMLElement, t: Translate<SmContextPianoKey>): () => void {
  const scrollport = flow.closest<HTMLElement>(SCROLL_SELECTOR) ?? flow.parentElement
  const root = scrollport?.parentElement
  if (scrollport === null || scrollport === undefined || root === null || root === undefined) return () => {}

  const strip = document.createElement('div')
  strip.className = 'smcp-strip'
  strip.tabIndex = 0
  strip.setAttribute('role', 'navigation')
  strip.setAttribute('aria-label', t('nav.aria'))
  const tooltip = document.createElement('div')
  tooltip.className = 'smcp-tooltip'
  tooltip.setAttribute('aria-hidden', 'true')

  const originalRootPosition = root.style.position
  const forcedRootPosition = window.getComputedStyle(root).position === 'static'
  if (forcedRootPosition) root.style.position = 'relative'
  root.append(strip, tooltip)

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
  let railTop = 0
  let railLeft = 0

  const markerByKey = (key: string | null): Marker | null => key === null
    ? null
    : markers.find(marker => marker.descriptor.key === key) ?? null

  const baseWidth = (marker: Marker): number => marker.descriptor.key === currentKey ? CURRENT_WIDTH : BASE_WIDTH

  const paintWidths = (pointerY: number | null): void => {
    const visible = markers.filter(marker => marker.row !== null && !marker.el.hidden)
    const sigma = KEY_PITCH * 1.35
    const divisor = 2 * sigma * sigma
    for (const marker of visible) {
      const base = baseWidth(marker)
      const falloff = pointerY === null ? 0 : Math.exp(-((pointerY - marker.y) ** 2) / divisor)
      const max = marker.descriptor.key === currentKey ? HOVER_WIDTH + 4 : HOVER_WIDTH
      marker.el.style.width = `${(base + (max - base) * falloff).toFixed(1)}px`
    }
  }

  const positionTooltip = (marker: Marker): void => {
    const rootWidth = root.clientWidth
    const tooltipWidth = tooltip.offsetWidth || Math.min(560, Math.max(280, rootWidth - 32))
    const tooltipHeight = tooltip.offsetHeight || 100
    const preferredLeft = railLeft + RAIL_WIDTH + TOOLTIP_GAP
    const left = preferredLeft + tooltipWidth <= rootWidth - 8 ? preferredLeft : Math.max(8, railLeft - tooltipWidth - 10)
    const top = Math.max(8, Math.min(railTop + marker.y - tooltipHeight / 2, root.clientHeight - tooltipHeight - 8))
    tooltip.style.left = `${left.toFixed(1)}px`
    tooltip.style.top = `${top.toFixed(1)}px`
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
    const rootWidth = root.clientWidth || rootRect.width
    const measuredFlowLeft = flowRect.left - rootRect.left
    const flowLeft = Number.isFinite(measuredFlowLeft) && flowRect.width > 0
      ? measuredFlowLeft
      : Math.max(96, (rootWidth - Math.min(760, rootWidth)) / 2)
    railLeft = Math.max(16, flowLeft - RAIL_TO_FLOW)
    railTop = (root.clientHeight - RAIL_HEIGHT) / 2
    strip.style.left = `${railLeft.toFixed(1)}px`
    strip.style.height = `${RAIL_HEIGHT}px`

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
    const windowRange = visibleWindow(anchored.length, currentIndex)
    const visible = anchored.slice(windowRange.start, windowRange.end)
    const positions = stackPositions(visible.length)
    for (let index = 0; index < visible.length; index += 1) {
      const marker = visible[index]
      marker.y = positions[index]
      marker.el.hidden = false
      marker.el.style.top = `${(marker.y - MARK_HEIGHT / 2).toFixed(1)}px`
      marker.el.style.height = `${MARK_HEIGHT}px`
    }

    const overlap = flowLeft < MIN_GUTTER || railLeft + RAIL_WIDTH + 12 > flowLeft
    debug.hiddenReason = visible.length === 0 ? 'empty' : rootWidth < MIN_ROOT_WIDTH ? 'narrow' : overlap ? 'overlap' : null
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
    const session = ctx.sessions.binding(sessionId)?.session
    if (session === undefined) return
    const snapshot = session.getSnapshot()
    const nodes: ChatConversationViewNode[] = []
    for (const key of snapshot.chat.order) {
      const node = snapshot.chat.nodes.get(key)
      if (node !== undefined) nodes.push(node)
    }
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
      debug.sessionId = nextId === undefined ? undefined : String(nextId)
      reconcileMarkers([])
    }
    if (sessionId === undefined || sessionUnsub !== undefined) return
    const session = ctx.sessions.binding(sessionId)?.session
    if (session === undefined) {
      if (retryCount < BIND_RETRY_MAX) {
        retryCount += 1
        retryTimer = window.setTimeout(bindSession, BIND_RETRY_MS)
      } else {
        console.warn('[dsh-sm-context-piano] session binding unavailable:', String(sessionId))
      }
      return
    }
    retryCount = 0
    retryTimer = undefined
    sessionUnsub = session.subscribe(rebuild)
    rebuild()
  }

  const nearestMarker = (localY: number): Marker | null => {
    let nearest: Marker | null = null
    let distance = Number.POSITIVE_INFINITY
    for (const marker of markers) {
      if (marker.row === null || marker.el.hidden) continue
      const candidate = Math.abs(localY - marker.y)
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
    latestPointerY = next.y
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
  strip.addEventListener('pointermove', onPointerMove)
  strip.addEventListener('pointerleave', clearInteraction)
  strip.addEventListener('click', onClick)
  strip.addEventListener('keydown', onKeyDown)
  strip.addEventListener('blur', clearInteraction)
  scrollport.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', scheduleLayout)
  const listUnsub = ctx.sessions.list.subscribe(bindSession)

  bindSession()
  scheduleLayout()

  return () => {
    alive = false
    listUnsub()
    sessionUnsub?.()
    flowObserver.disconnect()
    resizeObserver?.disconnect()
    strip.removeEventListener('pointermove', onPointerMove)
    strip.removeEventListener('pointerleave', clearInteraction)
    strip.removeEventListener('click', onClick)
    strip.removeEventListener('keydown', onKeyDown)
    strip.removeEventListener('blur', clearInteraction)
    scrollport.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', scheduleLayout)
    if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    if (layoutFrame !== 0) window.cancelAnimationFrame(layoutFrame)
    if (pointerFrame !== 0) window.cancelAnimationFrame(pointerFrame)
    if (scrollFrame !== 0) window.cancelAnimationFrame(scrollFrame)
    strip.remove()
    tooltip.remove()
    if (forcedRootPosition && root.style.position === 'relative') root.style.position = originalRootPosition
    if (debugTarget.__smcpDebug === debug) debugTarget.__smcpDebug = undefined
  }
}
