/**
 * Client half bundle: CJS factory output. react and every @deepseek-ai/*
 * package stay external as `require(...)` calls — the DSH client module
 * loader answers them. scripts/wrap-client.mjs then wraps the output in
 * `window.__ModuleLoader__.load({ id, factory })`, the exact shape
 * dsh-client-modules expects from served plugin bundles. Plain .mjs config —
 * a .ts config trips a known Node 26 tsdown config-loader bug.
 */
export default {
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  sourcemap: false,
  clean: false,
  loader: {
    // CJS plugin bundles execute through DSH's module loader, so a relative
    // asset URL would resolve against the app document instead of the bundle.
    '.png': 'dataurl',
  },
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [/^react/, /^@deepseek-ai\//],
  },
}
