/**
 * Wrap the tsdown CJS client output in the DSH client module-loader handoff:
 * `window.__ModuleLoader__.load({ id, factory })`, where the factory receives
 * the loader's synchronous `require`. This mirrors the exact shape the
 * dsh-client-modules runtime expects from served plugin bundles (see
 * @deepseek-ai/dsh-client-modules, ClientModuleSystem materialize/require).
 *
 * Idempotent on the wrapped form only (a double run would re-wrap; the build
 * always produces the raw CJS output first).
 */
import { readFile, writeFile } from 'node:fs/promises'

const PACKAGE_ID = '@hjj345345/dsh-sm-context-piano'
const target = new URL('../lib/client.js', import.meta.url)

let code = await readFile(target, 'utf8')

// Idempotency guard: a double wrap would nest the factory. The build always
// feeds the raw CJS output; bailing here only catches a manual double run.
if (code.startsWith('window.__ModuleLoader__.load({')) {
  console.log('already wrapped — skipping')
  process.exit(0)
}

// Defensive strip: the bundler's own cjs shims (use strict, the esModule
// marker, and a Symbol.toStringTag line) are either harmless inside the
// factory or duplicated by the wrapper — drop them; the sourcemap comment
// must not trail the wrapper.
code = code
  .replace(/^["']use strict["'];?\s*\n?/m, '')
  .replace(/^Object\.defineProperty\(exports, Symbol\.toStringTag, \{ value: "Module" \}\);?\s*\n?/m, '')
  .replace(/^Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);?\s*\n?/m, '')
  .replace(/\/\/# sourceMappingURL=.*$/m, '')
  .trimEnd()

const body = code
  .split('\n')
  .map((line) => (line === '' ? '' : `\t\t${line}`))
  .join('\n')

const wrapped = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(PACKAGE_ID)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${body}
\t\treturn module.exports;
\t}
});
`

await writeFile(target, wrapped, 'utf8')
console.log(`wrapped ${new URL('../lib/client.js', import.meta.url).pathname} for ${PACKAGE_ID}`)
