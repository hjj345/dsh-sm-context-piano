# sm-context-piano

A Codex-style conversation navigator for the DeepSeek Harness Web GUI.

The plugin renders a compact rail beside the transcript. Keys represent only user messages and model-visible text output. Adjacent model output merges until a tool, edit, reasoning, or another non-output event breaks continuity. By default, at most 20 keys around the active reading node are shown; selecting a boundary key reveals earlier or later history.

This is navigation-only UI. It never mutates sessions, trims model context, injects system prompts, or exposes an extra HTTP endpoint.

## Features

- **Output-only nodes** — only user messages and model-visible text create keys; tools, edits, reads, reasoning, and internal status rows never do.
- **Continuous-output merging** — adjacent assistant text merges, while output separated by non-output content remains distinct.
- **Fixed key window** — 230px default height, 12px pitch, 2px key thickness, at most 20 keys, with no spacing compression.
- **Active-node centering** — the window follows the current reading node; selecting its top or bottom boundary reveals earlier or later keys.
- **Continuous hover wave** — the entire rail is interactive, including the gaps between marks.
- **Codex-like preview** — a light/dark floating card shows the node title and text excerpt and stays inside the viewport.
- **Fast jump** — click the rail or press Enter to scroll to the selected row.
- **Reading-position tracking** — the active paragraph mark becomes darker and longer immediately while scrolling.
- **Incremental updates** — streaming and history changes reuse existing marker elements and preserve interaction state.
- **Keyboard support** — Arrow keys, Home, End, Enter, Space, and Escape cover selection and jump.
- **Theme and motion support** — follows DSH theme variables and `prefers-reduced-motion`.
- **Complete teardown** — DOM, styles, listeners, observers, timers, and animation frames are removed on unload.

## Settings

Open the first-level **sm-context-piano** entry in DSH Settings. It is ordered directly after the official **Agent Presets** entry. Its navigation icon intentionally follows DSH's default gear fallback for third-party setting IDs.

Settings are persisted by DSH and take effect immediately:

- Enable or disable the navigator;
- Key thickness: 1–4px, default 2px;
- Key center pitch: 6–18px, default 12px;
- Maximum visible keys: 5–30, default 20.

The rail height is derived automatically as `(maximum - 1) × pitch + key thickness`; the defaults produce `(20 - 1) × 12 + 2 = 230px`. The page also offers reset-to-defaults and shows version `v1.0`, release date, author, email, installation command, and the currently unpublished GitHub status.

## Install

```powershell
dsh plugin --profile web add @linxin666/dsh-sm-context-piano
```

Local development link:

```powershell
dsh plugin --profile web add link:D:/android-project/dsh-sm-context-piano-2026.08.16
```

Build the package, then refresh or reopen the DSH Web GUI.

Current version: `v1.0` (released `2026-08-19`).

## Development

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm.

```powershell
pnpm install
pnpm verify
```

`pnpm verify` runs TypeScript checks, both production bundles, the client wrapper, built-artifact smoke tests, and jsdom interaction tests.

## Boundaries

- The navigator relies on the current ChatView anchors: `[data-chat-flow]`, `[data-chat-anchor-key]`, and `[data-conversation-scroll]`.
- Preferences use DSH's official `settings.section` and settings namespace rather than browser-local private storage.
- Only history already loaded into ChatView receives markers.
- Tools, edits, commands, reasoning, and internal status rows never create keys or appear on hover.
- Multiple visible text runs separated inside one DOM row may create separate keys, but Harness row-level anchors mean they jump to the same message-row start.
- Preview content is written with `textContent`; conversation HTML is never executed.

See [docs/DESIGN.md](docs/DESIGN.md) for the implementation contract and [docs/PLAN.md](docs/PLAN.md) for the verification record.

## License

Apache-2.0
