/**
 * Host half bundle: plain ESM for the DSH node process. node: builtins and
 * every @deepseek-ai/* package stay external (resolved by the host loader);
 * our own src is inlined. Plain .mjs config — a .ts config trips a known
 * Node 26 tsdown config-loader bug.
 */
export default {
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  sourcemap: false,
  clean: false,
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [/^node:/, /^@deepseek-ai\//],
  },
}
