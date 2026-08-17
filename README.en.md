# sm-context-piano

A Codex-style conversation navigator for the DeepSeek Harness Web GUI.

The plugin renders a compact rail of horizontal marks beside the transcript. Default marks represent user-meaningful semantic groups; assistant steps and tool activity in the same turn expand only when approached. Moving along the rail previews each child, and clicking jumps to the matching message.

This is navigation-only UI. It never mutates sessions, trims model context, injects system prompts, or exposes an extra HTTP endpoint.

## Features

- **Real-position projection** — marks reflect the actual vertical positions of rendered chat rows instead of equal index spacing.
- **Semantic reduction** — same-turn assistant steps merge, tool activity belongs to its turn, and transient internal status rows do not become marks.
- **Progressive expansion** — hovering a multi-node group fans out its assistant and tool children, then collapses them on leave.
- **Continuous hover wave** — the entire rail is interactive, including the gaps between marks.
- **Codex-like preview** — a light/dark floating card shows the node title and text excerpt and stays inside the viewport.
- **Fast jump** — click the rail or press Enter to scroll to the selected row.
- **Reading-position tracking** — the active paragraph mark becomes darker and longer immediately while scrolling.
- **Incremental updates** — streaming and history changes reuse existing marker elements and preserve interaction state.
- **Keyboard support** — Arrow keys, Home, End, Enter, Space, and Escape cover selection, expansion, collapse, and jump.
- **Theme and motion support** — follows DSH theme variables and `prefers-reduced-motion`.
- **Complete teardown** — DOM, styles, listeners, observers, timers, and animation frames are removed on unload.

## Install

```powershell
dsh plugin --profile web add @linxin666/dsh-sm-context-piano
```

Local development link:

```powershell
dsh plugin --profile web add link:D:/android-project/dsh-sm-context-piano-2026.08.16
```

Build the package, then refresh or reopen the DSH Web GUI.

## Development

Requires Node.js `^22.19.0 || >=24.0.0` and pnpm.

```powershell
pnpm install
pnpm verify
```

`pnpm verify` runs TypeScript checks, both production bundles, the client wrapper, built-artifact smoke tests, and jsdom interaction tests.

## Boundaries

- The navigator relies on the current ChatView anchors: `[data-chat-flow]`, `[data-chat-anchor-key]`, and `[data-conversation-scroll]`.
- Only history already loaded into ChatView receives markers.
- Default marks represent semantic groups. Tool rows with their own anchors expand from the group; nested calls without row anchors remain part of their parent.
- Preview content is written with `textContent`; conversation HTML is never executed.

See [docs/DESIGN.md](docs/DESIGN.md) for the implementation contract and [docs/PLAN.md](docs/PLAN.md) for the verification record.

## License

Apache-2.0
