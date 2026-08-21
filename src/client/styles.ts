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
  font-weight: 400;
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
.smcp-settings-page {
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  padding: 8px 0 36px;
  color: var(--dsw-alias-label-primary, #202124);
}
.smcp-settings-page *,
.smcp-settings-page *::before,
.smcp-settings-page *::after { box-sizing: border-box; }
.smcp-settings-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .10));
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-2, #fff);
  min-width: 0;
}
.smcp-settings-icon {
  box-sizing: border-box;
  width: 54px;
  height: 54px;
  padding: 5px;
  object-fit: contain;
  flex: none;
}
.smcp-settings-hero-copy,
.smcp-settings-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.smcp-settings-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  overflow-wrap: anywhere;
}
.smcp-settings-subtitle,
.smcp-settings-description,
.smcp-settings-note {
  color: var(--dsw-alias-label-secondary, #73757a);
  font-size: 12px;
  line-height: 18px;
}
.smcp-settings-card {
  position: relative;
  min-width: 0;
  margin-top: 12px;
  padding: 16px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .10));
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-2, #fff);
}
.smcp-settings-card h2 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}
.smcp-settings-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 24px;
  min-height: 58px;
  border-top: 1px solid var(--dsw-alias-border-l4, rgba(0, 0, 0, .06));
}
.smcp-settings-label {
  font-size: 13px;
  line-height: 20px;
}
.smcp-settings-language { justify-content: space-between; }
.smcp-settings-select {
  width: 190px;
  max-width: 100%;
  min-height: 34px;
  padding: 6px 30px 6px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .14));
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-2, #fff);
  color: var(--dsw-alias-label-primary, #202124);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.smcp-settings-select:focus-visible { outline: 2px solid var(--dsw-alias-border-focus, #4c7ef3); outline-offset: 1px; }
.smcp-settings-select:disabled { opacity: .45; cursor: not-allowed; }
.smcp-settings-range {
  display: grid;
  grid-template-columns: 150px 44px;
  align-items: center;
  gap: 10px;
  flex: none;
}
.smcp-settings-range input {
  width: 150px;
  accent-color: #111;
}
.smcp-settings-range output {
  color: var(--dsw-alias-label-secondary, #73757a);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.smcp-settings-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: none;
}
.smcp-settings-switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.smcp-settings-switch > span {
  position: relative;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2, #c6c7ca);
  transition: background-color .15s ease;
}
.smcp-settings-switch > span::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .18);
  transition: transform .15s ease;
}
.smcp-settings-switch input:checked + span { background: #161719; }
.smcp-settings-switch input:checked + span::after { transform: translateX(14px); }
.smcp-settings-switch input:focus-visible + span { outline: 2px solid var(--dsw-alias-border-focus, #4c7ef3); outline-offset: 2px; }
.smcp-settings-switch input:disabled + span,
.smcp-settings-row input:disabled { opacity: .45; cursor: not-allowed; }
.smcp-settings-switch b {
  min-width: 44px;
  font-size: 12px;
  font-weight: 400;
}
.smcp-settings-total {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--dsw-alias-border-l4, rgba(0, 0, 0, .06));
  color: var(--dsw-alias-label-secondary, #73757a);
  font-size: 12px;
}
.smcp-settings-total strong { color: var(--dsw-alias-label-primary, #202124); font-weight: 500; }
.smcp-settings-reset {
  margin-top: 14px;
  padding: 7px 12px;
  border: 1px solid #161719;
  border-radius: 9px;
  background: #161719;
  color: #fff;
  cursor: pointer;
}
.smcp-settings-reset:hover:not(:disabled) { background: #2c2d30; border-color: #2c2d30; }
.smcp-settings-reset:disabled { opacity: .45; cursor: not-allowed; }
.smcp-settings-error { margin: 10px 0 0; color: var(--dsw-alias-state-danger, #d93025); font-size: 12px; }
.smcp-settings-note { margin: 10px 0 0; }
.smcp-settings-about dl { margin: 0; }
.smcp-settings-about dl > div {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 16px;
  padding: 7px 0;
  font-size: 12px;
}
.smcp-settings-about dt { color: var(--dsw-alias-label-secondary, #73757a); }
.smcp-settings-about dd { margin: 0; overflow-wrap: anywhere; }
.smcp-settings-about a { color: inherit; }
.smcp-settings-command-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 7px 7px 7px 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, .10));
  border-radius: 10px;
  background: #f3f3f4;
  font-size: 12px;
}
.smcp-settings-command-box code {
  display: block;
  min-width: 0;
  color: #1a1c1f;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: break-word;
}
.smcp-settings-command-box button {
  flex: none;
  padding: 5px 9px;
  border: 1px solid #161719;
  border-radius: 7px;
  background: #161719;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}
.smcp-settings-command-box button:hover { background: #2c2d30; border-color: #2c2d30; }
.smcp-settings-command-box button:focus-visible { outline: 2px solid var(--dsw-alias-border-focus, #4c7ef3); outline-offset: 1px; }
body[data-ds-dark-theme] .smcp-bar {
  --smcp-key: rgba(255, 255, 255, .32);
  --smcp-key-active: rgba(255, 255, 255, .94);
}
body[data-ds-dark-theme] .smcp-tooltip {
  background: var(--dsw-alias-bg-layer-2, rgba(35, 35, 39, .98));
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, .10));
  box-shadow: 0 10px 32px rgba(0, 0, 0, .34);
}
body[data-ds-dark-theme] .smcp-settings-switch input:checked + span { background: #f1f1f3; }
body[data-ds-dark-theme] .smcp-settings-switch input:checked + span::after { background: #202124; }
@media (max-width: 760px) {
  .smcp-settings-row { align-items: flex-start; flex-direction: column; gap: 8px; padding: 12px 0; }
  .smcp-settings-language { align-items: center; flex-direction: row; }
  .smcp-settings-range { width: 100%; grid-template-columns: minmax(0, 1fr) 44px; }
  .smcp-settings-range input { width: 100%; }
}
@media (max-width: 520px) {
  .smcp-settings-hero { align-items: flex-start; flex-wrap: wrap; gap: 12px; padding: 14px; }
  .smcp-settings-icon { width: 48px; height: 48px; padding: 4px; }
  .smcp-settings-hero-copy { flex-basis: calc(100% - 60px); }
  .smcp-settings-switch {
    width: 100%;
    justify-content: flex-end;
    padding-top: 10px;
    border-top: 1px solid var(--dsw-alias-border-l4, rgba(0, 0, 0, .06));
  }
  .smcp-settings-card { padding: 14px; }
  .smcp-settings-about dl > div { grid-template-columns: 88px minmax(0, 1fr); gap: 10px; }
  .smcp-settings-command-box { align-items: start; }
}
@media (max-width: 360px) {
  .smcp-settings-language { align-items: flex-start; flex-direction: column; }
  .smcp-settings-select { width: 100%; }
  .smcp-settings-about dl > div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .smcp-settings-total { align-items: flex-start; flex-direction: column; gap: 4px; }
  .smcp-settings-command-box { gap: 10px; padding-left: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .smcp-bar, .smcp-tooltip, .smcp-settings-switch > span, .smcp-settings-switch > span::after { transition: none; }
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
