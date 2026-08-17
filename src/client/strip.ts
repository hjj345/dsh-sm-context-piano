/**
 * Codex-style conversation navigator: a compact rail of horizontal marks
 * projected from the real vertical positions of rendered ChatView rows.
 */

import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { buildNavigationGroups, describeNode } from './keys.ts'
import type { KeyDescriptor, NavigationGroup } from './keys.ts'
import { updateTooltip } from './tooltip.ts'
import type { SmContextPianoKey } from './locales.ts'

const FLOW_SELECTOR = '[data-chat-flow]'
const SCROLL_SELECTOR = '[data-conversation-scroll]'
const ROW_SELECTOR = '[data-chat-anchor-key]'

const RAIL_WIDTH = 58
const RAIL_MAX_HEIGHT = 520
const RAIL_HEIGHT_RATIO = 0.44
const RAIL_TO_FLOW = 108
const TOOLTIP_GAP = 6
const MIN_ROOT_WIDTH = 520
const MIN_GUTTER = 82
const BASE_WIDTH = 10
const CURRENT_WIDTH = 24
const HOVER_WIDTH = 48
const MARK_HEIGHT_MAX = 4
const MARK_HEIGHT_MIN = 2
const EXPANDED_GAP_MAX = 12
const EXPANDED_SPAN_MAX = 168
const BIND_RETRY_MS = 300
const BIND_RETRY_MAX = 20

interface Marker {
  el: HTMLButtonElement
  descriptor: KeyDescriptor
  groupId: string
  row: HTMLElement | null
  contentY: number
  y: number
}

interface DebugState {
  mounted: boolean
  bars: number
  sessionId: string | undefined
  hiddenReason: 'empty' | 'narrow' | 'overlap' | null
}

/**
 * Project ordered content coordinates into a bounded rail while preserving
 * meaningful gaps and preventing adjacent marks from becoming unclickable.
 */
export function projectPositions(values: readonly number[], height: number, padding = 4): number[] {
  if (values.length === 0) return []
  if (values.length === 1) return [height / 2]

  const low = Math.max(0, padding)
  const high = Math.max(low, height - padding)
  const span = high - low
  const sourceLow = values[0]
  const sourceHigh = values[values.length - 1]
  const sourceSpan = sourceHigh - sourceLow
  const positions = sourceSpan <= 0
    ? values.map((_, index) => low + (index / (values.length - 1)) * span)
    : values.map(value => low + ((value - sourceLow) / sourceSpan) * span)

  const gap = Math.min(10, span / (values.length - 1))
  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index], positions[index - 1] + gap)
  }
  if (positions[positions.length - 1] > high) {
    positions[positions.length - 1] = high
    for (let index = positions.length - 2; index >= 0; index -= 1) {
      positions[index] = Math.min(positions[index], positions[index + 1] - gap)
    }
  }
  return positions
}

/** Mount and track the active ChatView without claiming a conversation slot. */
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
    if (disposed || reconcileFrame !== 0) return
    if (mountedFlow?.isConnected) return
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
    disposeMount = undefined
    mountedFlow = null
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

  const debug: DebugState = { mounted: true, bars: 0, sessionId: undefined, hiddenReason: 'empty' }
  const debugTarget = globalThis as unknown as { __smcpDebug?: DebugState }
  debugTarget.__smcpDebug = debug

  let alive = true
  let markers: Marker[] = []
  let groups: NavigationGroup[] = []
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
  let currentGroupId: string | null = null
  let expandedGroupId: string | null = null
  let groupPositions = new Map<string, number>()
  let railTop = 0
  let railLeft = 0

  const markerByKey = (key: string | null): Marker | null => key === null
    ? null
    : markers.find(marker => marker.descriptor.key === key) ?? null

  const baseWidth = (marker: Marker): number => marker.groupId === currentGroupId ? CURRENT_WIDTH : BASE_WIDTH

  const paintWidths = (pointerY: number | null): void => {
    if (markers.length === 0) return
    const visible = markers.filter(marker => marker.row !== null && !marker.el.hidden)
    const averageGap = visible.length > 1 ? Math.max(8, (visible[visible.length - 1].y - visible[0].y) / (visible.length - 1)) : 24
    const sigma = Math.max(18, Math.min(42, averageGap * 1.35))
    const divisor = 2 * sigma * sigma
    for (const marker of markers) {
      if (marker.row === null) continue
      const base = baseWidth(marker)
      const falloff = pointerY === null ? 0 : Math.exp(-((pointerY - marker.y) ** 2) / divisor)
      const max = marker.groupId === currentGroupId ? HOVER_WIDTH + 4 : HOVER_WIDTH
      marker.el.style.width = `${(base + (max - base) * falloff).toFixed(1)}px`
    }
  }

  const positionTooltip = (marker: Marker): void => {
    const rootWidth = root.clientWidth
    const tooltipWidth = tooltip.offsetWidth || Math.min(560, Math.max(280, rootWidth - 32))
    const tooltipHeight = tooltip.offsetHeight || 100
    const preferredLeft = railLeft + RAIL_WIDTH + TOOLTIP_GAP
    const left = preferredLeft + tooltipWidth <= rootWidth - 8
      ? preferredLeft
      : Math.max(8, railLeft - tooltipWidth - 10)
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

  const setCurrent = (key: string | null): void => {
    const nextGroupId = markerByKey(key)?.groupId ?? null
    if (key === currentKey && nextGroupId === currentGroupId) return
    currentKey = key
    currentGroupId = nextGroupId
    for (const marker of markers) marker.el.classList.toggle('smcp-bar-current', marker.groupId === currentGroupId)
    paintWidths(latestPointerY)
  }

  const updateCurrent = (): void => {
    const anchored = markers.filter(marker => marker.row !== null).sort((a, b) => a.contentY - b.contentY)
    if (anchored.length === 0) {
      setCurrent(null)
      return
    }
    const readingLine = scrollport.scrollTop + Math.min(120, scrollport.clientHeight * 0.18)
    let low = 0
    let high = anchored.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (anchored[middle].contentY <= readingLine) low = middle
      else high = middle - 1
    }
    setCurrent(anchored[low].descriptor.key)
  }

  const measureLayout = (): void => {
    layoutFrame = 0
    if (!alive || !strip.isConnected) return

    const rootRect = root.getBoundingClientRect()
    const flowRect = flow.getBoundingClientRect()
    const rootHeight = root.clientHeight || rootRect.height
    const rootWidth = root.clientWidth || rootRect.width
    const measuredFlowLeft = flowRect.left - rootRect.left
    const flowLeft = Number.isFinite(measuredFlowLeft) && flowRect.width > 0
      ? measuredFlowLeft
      : Math.max(96, (rootWidth - Math.min(760, rootWidth)) / 2)
    const height = Math.min(RAIL_MAX_HEIGHT, Math.max(220, rootHeight * RAIL_HEIGHT_RATIO))
    railLeft = Math.max(16, flowLeft - RAIL_TO_FLOW)
    railTop = (rootHeight - height) / 2
    strip.style.left = `${railLeft.toFixed(1)}px`
    strip.style.height = `${height.toFixed(1)}px`

    const rows = new Map<string, HTMLElement>()
    for (const row of flow.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
      const key = row.dataset.chatAnchorKey
      if (key !== undefined) rows.set(key, row)
    }
    const scrollRect = scrollport.getBoundingClientRect()
    for (const marker of markers) {
      marker.row = rows.get(marker.descriptor.key) ?? null
      marker.el.hidden = true
      if (marker.row !== null) {
        marker.contentY = marker.row.getBoundingClientRect().top - scrollRect.top + scrollport.scrollTop
      }
    }

    const layouts = groups.flatMap(group => {
      const members = group.members
        .map(member => markerByKey(member.key))
        .filter((marker): marker is Marker => marker !== null && marker.row !== null)
        .sort((a, b) => a.contentY - b.contentY)
      if (members.length === 0) return []
      const representative = members.find(marker => marker.descriptor.key === group.primaryKey) ?? members[0]
      return [{ group, members, representative, contentY: representative.contentY, y: 0 }]
    }).sort((a, b) => a.contentY - b.contentY)

    if (expandedGroupId !== null && !layouts.some(layout => layout.group.id === expandedGroupId)) {
      expandedGroupId = null
    }
    const projected = projectPositions(layouts.map(layout => layout.contentY), height)
    groupPositions = new Map()
    const markHeight = Math.max(MARK_HEIGHT_MIN, Math.min(MARK_HEIGHT_MAX, height / Math.max(1, layouts.length * 2.1)))
    for (let index = 0; index < layouts.length; index += 1) {
      const layout = layouts[index]
      layout.y = projected[index]
      groupPositions.set(layout.group.id, layout.y)
      if (layout.group.id === expandedGroupId && layout.members.length > 1) {
        const ordered = [
          layout.representative,
          ...layout.members.filter(marker => marker !== layout.representative),
        ]
        const availableBelow = height - 4 - layout.y
        const availableAbove = layout.y - 4
        const direction = availableBelow >= availableAbove ? 1 : -1
        const available = Math.max(availableBelow, availableAbove)
        const gap = Math.min(
          EXPANDED_GAP_MAX,
          EXPANDED_SPAN_MAX / (ordered.length - 1),
          available / (ordered.length - 1),
        )
        for (let memberIndex = 0; memberIndex < ordered.length; memberIndex += 1) {
          const marker = ordered[memberIndex]
          marker.y = layout.y + direction * memberIndex * gap
          marker.el.hidden = false
          marker.el.classList.toggle('smcp-bar-child', marker !== layout.representative)
        }
      } else {
        layout.representative.y = layout.y
        layout.representative.el.hidden = false
        layout.representative.el.classList.remove('smcp-bar-child')
      }
    }
    for (const marker of markers) {
      marker.el.style.top = `${(marker.y - markHeight / 2).toFixed(1)}px`
      marker.el.style.height = `${markHeight.toFixed(1)}px`
      marker.el.classList.toggle('smcp-bar-group-active', marker.groupId === expandedGroupId)
    }

    const overlap = flowLeft < MIN_GUTTER || railLeft + RAIL_WIDTH + 12 > flowLeft
    debug.hiddenReason = layouts.length === 0 ? 'empty' : rootWidth < MIN_ROOT_WIDTH ? 'narrow' : overlap ? 'overlap' : null
    strip.classList.toggle('smcp-strip-hidden', debug.hiddenReason !== null)
    if (debug.hiddenReason !== null) {
      latestPointerY = null
      setHover(null)
    } else if (markerByKey(hoverKey)?.row === null) {
      setHover(null)
    }
    strip.classList.toggle('smcp-strip-expanded', expandedGroupId !== null)
    debug.bars = markers.filter(marker => !marker.el.hidden).length
    updateCurrent()
    paintWidths(latestPointerY)
    if (latestPointerY !== null) setHover(nearestMarker(latestPointerY))
    const hovered = markerByKey(hoverKey)
    if (hovered !== null) positionTooltip(hovered)
  }

  const scheduleLayout = (): void => {
    if (!alive || layoutFrame !== 0) return
    layoutFrame = window.requestAnimationFrame(measureLayout)
  }

  const reconcileMarkers = (nextGroups: readonly NavigationGroup[]): void => {
    const existing = new Map(markers.map(marker => [marker.descriptor.key, marker]))
    const next: Marker[] = []
    for (const group of nextGroups) {
      for (const descriptor of group.members) {
        let marker = existing.get(descriptor.key)
        if (marker === undefined) {
          const el = document.createElement('button')
          el.type = 'button'
          el.tabIndex = -1
          el.className = 'smcp-bar'
          el.dataset.key = descriptor.key
          marker = {
            el,
            descriptor,
            groupId: group.id,
            row: null,
            contentY: 0,
            y: 0,
          }
        } else {
          existing.delete(descriptor.key)
          marker.descriptor = descriptor
          marker.groupId = group.id
        }
        marker.el.dataset.group = group.id
        marker.el.setAttribute('aria-label', descriptor.title)
        strip.appendChild(marker.el)
        next.push(marker)
      }
    }
    for (const marker of existing.values()) marker.el.remove()
    markers = next
    groups = [...nextGroups]
    if (expandedGroupId !== null && !groups.some(group => group.id === expandedGroupId)) expandedGroupId = null
    const hovered = markerByKey(hoverKey)
    if (hovered === null) {
      setHover(null)
    } else {
      updateTooltip(tooltip, hovered.descriptor)
      window.requestAnimationFrame(() => {
        if (alive && hoverKey === hovered.descriptor.key) positionTooltip(hovered)
      })
    }
    scheduleLayout()
  }

  const rebuild = (): void => {
    if (!alive || sessionId === undefined) return
    const session = ctx.sessions.binding(sessionId)?.session
    if (session === undefined) return
    const snapshot = session.getSnapshot()
    const descriptors: KeyDescriptor[] = []
    for (const key of snapshot.chat.order) {
      const node = snapshot.chat.nodes.get(key)
      if (node !== undefined) descriptors.push(describeNode(node))
    }
    reconcileMarkers(buildNavigationGroups(descriptors))
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

  const nearestGroup = (localY: number): NavigationGroup | null => {
    if (expandedGroupId !== null) {
      const expanded = markers.filter(marker => marker.groupId === expandedGroupId && !marker.el.hidden)
      if (expanded.length > 0) {
        const low = Math.min(...expanded.map(marker => marker.y)) - 8
        const high = Math.max(...expanded.map(marker => marker.y)) + 8
        if (localY >= low && localY <= high) {
          return groups.find(group => group.id === expandedGroupId) ?? null
        }
      }
    }
    let nearest: NavigationGroup | null = null
    let distance = Number.POSITIVE_INFINITY
    for (const group of groups) {
      const y = groupPositions.get(group.id)
      if (y === undefined) continue
      const candidate = Math.abs(localY - y)
      if (candidate < distance) {
        nearest = group
        distance = candidate
      }
    }
    return nearest
  }

  const setExpanded = (groupId: string | null): void => {
    if (groupId === expandedGroupId) return
    expandedGroupId = groupId
    strip.classList.toggle('smcp-strip-expanded', groupId !== null)
    scheduleLayout()
  }

  const onPointerMove = (event: PointerEvent): void => {
    latestPointerY = event.clientY - strip.getBoundingClientRect().top
    if (pointerFrame !== 0) return
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0
      if (!alive || latestPointerY === null) return
      const group = nearestGroup(latestPointerY)
      const nextExpanded = group !== null && group.members.length > 1 ? group.id : null
      if (nextExpanded !== expandedGroupId) {
        setExpanded(nextExpanded)
        return
      }
      const nearest = nearestMarker(latestPointerY)
      setHover(nearest)
      paintWidths(latestPointerY)
    })
  }

  const onPointerLeave = (): void => {
    latestPointerY = null
    setHover(null)
    setExpanded(null)
    paintWidths(null)
  }

  const onBlur = (): void => {
    latestPointerY = null
    setHover(null)
    setExpanded(null)
    paintWidths(null)
  }

  const jumpTo = (marker: Marker | null): void => {
    if (marker === null || marker.row === null) return
    setCurrent(marker.descriptor.key)
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
    if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault()
      setHover(null)
      setExpanded(null)
      paintWidths(null)
      return
    }
    if (event.key === 'ArrowRight') {
      const selected = markerByKey(hoverKey) ?? markerByKey(currentKey) ?? visible[0]
      const group = groups.find(item => item.id === selected.groupId)
      if (group !== undefined && group.members.length > 1) {
        event.preventDefault()
        setExpanded(group.id)
      }
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
      if (alive) updateCurrent()
    })
  }

  const flowObserver = new MutationObserver(scheduleLayout)
  flowObserver.observe(flow, { childList: true })
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleLayout)
  resizeObserver?.observe(root)
  resizeObserver?.observe(scrollport)
  resizeObserver?.observe(flow)

  strip.addEventListener('pointermove', onPointerMove)
  strip.addEventListener('pointerleave', onPointerLeave)
  strip.addEventListener('click', onClick)
  strip.addEventListener('keydown', onKeyDown)
  strip.addEventListener('blur', onBlur)
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
    strip.removeEventListener('pointerleave', onPointerLeave)
    strip.removeEventListener('click', onClick)
    strip.removeEventListener('keydown', onKeyDown)
    strip.removeEventListener('blur', onBlur)
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
