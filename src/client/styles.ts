/** Codex-like conversation navigator visuals. */

const CSS = `
.smcp-strip {
  position: absolute;
  top: 50%;
  width: 58px;
  transform: translateY(-50%);
  z-index: 20;
  pointer-events: auto;
  touch-action: none;
  outline: none;
}
.smcp-strip:focus-visible::before {
  content: '';
  position: absolute;
  inset: -6px -4px;
  border: 1px solid var(--dsw-alias-border-focus, rgba(32, 94, 238, .5));
  border-radius: 8px;
}
.smcp-bar {
  appearance: none;
  position: absolute;
  left: 0;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--smcp-key, #c9c9cc);
  opacity: .78;
  pointer-events: none;
  transform-origin: left center;
  transition: top 110ms cubic-bezier(.2, .8, .2, 1), width 82ms cubic-bezier(.2, .8, .2, 1), background-color 100ms ease, opacity 100ms ease;
}
.smcp-bar-current,
.smcp-bar-hover {
  background: var(--smcp-key-active, #202124);
  opacity: 1;
}
.smcp-strip-expanded .smcp-bar:not(.smcp-bar-group-active) {
  opacity: .32;
}
.smcp-bar-child {
  opacity: .7;
}
.smcp-bar-child.smcp-bar-current,
.smcp-bar-child.smcp-bar-hover {
  opacity: 1;
}
.smcp-strip-hidden { display: none; }
.smcp-tooltip {
  position: absolute;
  z-index: 30;
  box-sizing: border-box;
  width: min(560px, calc(100vw - 32px));
  max-height: 224px;
  padding: 15px 16px 16px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .11));
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, .98));
  box-shadow: 0 8px 28px rgba(0, 0, 0, .10), 0 2px 8px rgba(0, 0, 0, .05);
  color: var(--dsw-alias-label-primary, #202124);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateX(-5px);
  transition: opacity 90ms ease, transform 110ms cubic-bezier(.2, .8, .2, 1), visibility 0s linear 110ms;
}
.smcp-tooltip-visible {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
  transition-delay: 0s;
}
.smcp-tooltip-title {
  display: block;
  overflow: hidden;
  color: var(--dsw-alias-label-primary, #202124);
  font-size: 14px;
  font-weight: 650;
  line-height: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.smcp-tooltip-body {
  display: -webkit-box;
  margin-top: 8px;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary, #73757a);
  font-size: 13px;
  line-height: 20px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 7;
}
body[data-ds-dark-theme] .smcp-bar {
  --smcp-key: rgba(255, 255, 255, .32);
  --smcp-key-active: rgba(255, 255, 255, .94);
}
body[data-ds-dark-theme] .smcp-tooltip {
  background: var(--dsw-alias-bg-layer-2, rgba(35, 35, 39, .98));
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, .10));
  box-shadow: 0 10px 32px rgba(0, 0, 0, .34);
}
@media (prefers-reduced-motion: reduce) {
  .smcp-bar, .smcp-tooltip { transition: none; }
}
`

const STYLE_ID = 'smcp-panel-styles'

export function installStyles(): () => void {
  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.appendChild(style)
  }
  return () => document.getElementById(STYLE_ID)?.remove()
}
