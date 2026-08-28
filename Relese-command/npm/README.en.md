# sm-context-piano | 琴键导航

English documentation · [简体中文（默认）](README.md)

[![version](https://img.shields.io/badge/version-1.1.0-blue?style=flat-square)](https://www.npmjs.com/package/%40hjj345345%2Fdsh-sm-context-piano) [![node](https://img.shields.io/badge/node-22.19%20or%2024%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/) [![license](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](LICENSE)

GitHub: [https://github.com/hjj345/dsh-sm-context-piano](https://github.com/hjj345/dsh-sm-context-piano)

npm: [@hjj345345/dsh-sm-context-piano](https://www.npmjs.com/package/%40hjj345345%2Fdsh-sm-context-piano)

A Codex-style conversation navigator for the DeepSeek Harness Web GUI.

It adds a compact rail of horizontal keys beside the transcript and condenses a long conversation into semantic nodes that can be previewed and located. Users can scan the conversation structure, hover for summaries, and click or use the keyboard to jump to a target paragraph instead of repeatedly dragging the scrollbar to recover context.

This is navigation-only UI. It never mutates session content, trims model context, injects system prompts, or exposes an additional HTTP endpoint.

## Why a piano-key navigator

Long-running agent sessions usually contain many user requests, model replies, tool calls, edits, and internal states. A normal scrollbar represents physical page position but says nothing about the meaning of each section.

The navigator reorganizes the transcript into recognizable nodes:

- Every user message becomes its own node;
- Continuous model output merges into one node;
- Tool calls, edits, reads, reasoning, and internal states never create keys;
- Model output separated by non-output content starts a new segment;
- The current reading node remains visible inside a fixed window.

The number of keys therefore does not simply equal the number of rendered rows. It more closely represents the meaningful conversation paragraphs a user can perceive.

## Features

- **Compact Codex-style keys** — defaults to 2px thickness, 12px center pitch, and 20 visible keys, kept in a concentrated stack rather than compressed indefinitely for long history.
- **Semantic nodes only** — user messages and model-visible text are included; tool, edit, read, reasoning, command, partial, and other internal rows are excluded.
- **Continuous-output merging** — adjacent model text remains one key until non-output content breaks continuity; output from separate stages stays independent.
- **Fixed-window browsing** — when nodes exceed the limit, a fixed number is shown around the current reading position; selecting a top or bottom boundary reveals earlier or later history.
- **Continuous hover wave** — the whole rail is an interactive hit area, so gaps between keys still select the nearest node and smoothly adjust neighboring widths.
- **Safe text previews** — the hover card shows a title and excerpt, follows light/dark themes, stays inside the viewport, and always writes content as plain text.
- **Fast paragraph jumps** — click a key or press Enter/Space to scroll to the beginning of its message row.
- **Reading-position tracking** — scrolling immediately darkens and lengthens the current key and recenters the fixed window.
- **Streaming incremental updates** — existing key DOM is reused while model output or loaded history changes, avoiding flicker and preserving interaction state.
- **Trilingual settings page** — Simplified Chinese, English, and Traditional Chinese are supported, with Simplified Chinese as the default; the choice applies immediately and is persisted by DSH.
- **Configurable layout** — key thickness, center pitch, and maximum visible count can be changed, and the total rail height is recalculated automatically.
- **Responsive settings UI** — General, Display, About, and Install Command cards adapt to narrow screens; long commands wrap without colliding with the copy button.
- **Keyboard and assistive-technology support** — keyboard selection, activation, and dismissal are supported; the rail exposes a navigation role and accessible name.
- **Theme and motion preferences** — follows DSH light/dark styling and respects `prefers-reduced-motion`.
- **Complete teardown** — unloading removes DOM, styles, listeners, observers, timers, and animation frames without leaving page side effects.

## Quick start

### Install from npm

```powershell
dsh plugin --profile web add @hjj345345/dsh-sm-context-piano
```

Refresh or reopen the DSH Web GUI after installation, then select **sm-context-piano** from the Settings navigation.

### Local development link

```powershell
dsh plugin --profile web add link:C:/path/to/dsh-sm-context-piano
```

## Controls

| Action | Result |
| --- | --- |
| Move the pointer over the rail | Select the nearest key, expand the wave, and show its paragraph preview |
| Click a key or the current rail position | Jump to the paragraph currently being previewed |
| Scroll the transcript | Update the current key and the fixed visible window |
| `ArrowUp` / `ArrowDown` | Move between keys visible in the current window |
| `Home` / `End` | Select the first or last key in the current window |
| `Enter` / `Space` | Jump to the selected key node |
| `Escape` | Close the preview and clear the hover state |

After a top or bottom boundary key is selected, the window is recalculated immediately so earlier or later nodes enter the visible range.

## Settings page

The plugin registers a first-level DSH Settings section directly after the official **Agent Presets** entry. Third-party section navigation intentionally uses DSH's official fallback gear icon.

### General settings

| Setting | Default | Description |
| --- | --- | --- |
| `语言/Language` | Simplified Chinese | Supports Simplified Chinese, English, and Traditional Chinese; changes only this plugin's settings-page copy |

The language choice is stored independently by the plugin. It does not change the global DSH locale; the first-level section name and the navigator's accessibility label continue to follow the DSH system language.

### Display settings

| Setting | Default | Range / behavior |
| --- | --- | --- |
| Enabled | On | Disable or re-enable the navigator at any time |
| Key thickness | `2px` | `1–4px` |
| Key spacing | `12px` | `6–18px`, measured between adjacent key centers |
| Maximum visible keys | `20` | `5–30`; a fixed window is used above this limit |
| Restore defaults | — | Restores language, enablement, and every display parameter |

Total rail height is derived automatically:

```text
(maximum visible keys - 1) × key spacing + key thickness
```

The defaults produce `(20 - 1) × 12 + 2 = 230px`.

### About and install command

The About card shows version, release date, author, email, the GitHub repository link, and the official npm package name and link. The Install Command card displays the complete command in its own code surface and provides a one-click copy button.

## How it works

1. Read the ordered nodes already loaded in the active conversation from `ConversationSnapshot.chat.order/nodes`;
2. Convert user messages and model-visible text into safe navigation descriptors while filtering every non-output node;
3. Merge assistant output by continuity and assign stable segment keys to separated output;
4. Match semantic nodes to rendered rows through `[data-chat-anchor-key]`;
5. Calculate the current node from the reading line and render only a fixed window centered around it;
6. Keep layout synchronized through the scroll container, MutationObserver, ResizeObserver, and animation-frame scheduling.

Keys are incrementally reused through stable identities, so streaming replies do not repeatedly clear and rebuild the whole rail.

## Compatibility and boundaries

- Designed for the DeepSeek Harness Web profile and the current ChatView anchors: `[data-chat-flow]`, `[data-chat-anchor-key]`, and `[data-conversation-scroll]`.
- Only history already loaded into ChatView receives keys; older records do not appear before DSH loads them.
- Tools, edits, commands, reasoning, and internal states never create keys or enter hover previews.
- Visible output runs separated inside one DOM row may create multiple keys, but Harness row-level anchors mean they all jump to the beginning of that message row.
- The rail safely hides when the page is too narrow, its gutter would overlap the transcript, or no navigable nodes exist.
- The current build environment requires Node.js `^22.19.0 || >=24.0.0`.

## Security and privacy

- Does not mutate Session, model context, system prompts, or conversation data;
- Registers no extra HTTP route and sends no plugin-owned network request;
- Persists preferences through the official DSH settings namespace rather than separate private browser storage;
- Writes preview content with `textContent` and never executes conversation HTML;
- Keeps user transcript content out of error messages;
- Removes rail DOM and conversation-bound listeners when disabled, and releases global observers and settings subscriptions on full unload.

## Development and verification

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm.

```powershell
pnpm install
pnpm verify
```

`pnpm verify` runs:

1. TypeScript project-reference and type checks;
2. Production host and client bundles;
3. DSH client-module wrapping;
4. Output-segmentation, fixed-window, and settings-boundary logic checks;
5. Built-artifact smoke checks;
6. jsdom page and interaction integration checks.

Current automated coverage includes 21 logic assertions, 4 built-artifact smoke checks, and 14 jsdom integration scenarios.

Internal design and acceptance materials remain in the repository's `docs/` directory and are not included in the npm package.

## FAQ

### Why are there no keys for tool calls or edit records?

Keys are navigation targets for content users directly perceive. Tools, edits, reads, reasoning, and internal states only act as continuity boundaries for model output.

### Why does a long conversation not show every key at once?

The navigator uses a fixed-size window so spacing is never compressed merely to fit all history. Select a top or bottom boundary node to progressively reveal earlier or later content.

### Why does the left Settings name not change with the plugin language?

The plugin language controls only the settings page. The DSH section name and the rail's accessibility label intentionally continue to follow the DSH system locale.

### Why are some older messages missing from the rail?

Keys cover only history already loaded into ChatView. DSH must load those older records before the plugin can create their navigation nodes.

### Do settings survive a refresh?

Yes. Language, enablement, and display parameters are persisted through the DSH settings namespace.

## License

This project is open source under the [MIT License](LICENSE).

## Changelog

### v1.1.0 · 2026-08-28

- Fixed the plugin dependency contract so host core packages can no longer be hoisted over the host-provided versions;
- Moved `@deepseek-ai/dsh-settings` and `@deepseek-ai/schemastery` to host-provided peer dependencies;
- Updated the development build baseline to DSH 0.1.1-rc.2 while retaining compatibility declarations for published DSH trains.

### v1.0.0 · 2026-08-21

Initial release:

- Added a Codex-style piano-key navigator covering user messages and model-visible text output only;
- Added continuous model-output merging while filtering tools, edits, reads, reasoning, commands, and internal states;
- Added fixed-window browsing, active-node centering, boundary-node paging, hover previews, and fast jumps;
- Added scroll-position tracking, streaming incremental updates, and stable DOM-node reuse;
- Added a first-level settings page with General, Display, About, and Install Command cards;
- Added immediate, persistent switching between Simplified Chinese, English, and Traditional Chinese, defaulting to Simplified Chinese;
- Kept the DSH section name and rail accessibility label tied to the DSH system locale;
- Added enablement, key thickness, spacing, maximum visible count, automatic rail height, and restore-default controls;
- Added one-click install-command copying, responsive settings layouts, narrow-screen wrapping, and light/dark theme support;
- Added mouse and keyboard controls, reduced-motion support, and complete teardown;
- Validated host/client integration, the settings schema, built artifacts, and jsdom interactions.
