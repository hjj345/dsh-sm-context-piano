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
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [/^react/, /^@deepseek-ai\//],
  },
}
