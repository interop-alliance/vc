# Agent Guidelines

## Load-bearing decisions (do not silently revert)

- `verify()`'s `includeCredentials` option **defaults to `true`** here,
  diverging from `@digitalbazaar/vc` (which defaults `false`). Downstream
  `@interop/verifier-core` depends on `credentialResult.credential`
  being present.

- The fine-grained verification **`log`** is the DCC innovation this fork exists
  to keep -- it is why we forked from DCC rather than re-porting onto
  `@digitalbazaar/vc`. It is threaded through `_verifyCredential` /
  `_checkCredential` (with `addStatusInfoToLog` for revocation/suspension) as a
  `LogEntry[]` and surfaced on results (`result.log`, `result.results[0].log`)
  and on thrown errors (`ErrorWithLog`, all in `src/index.ts`). Preserve it when
  editing the verify path.

## Toolchain & Project Layout

### Source layout

`src/` is five modules; the entire public API lives in `src/index.ts` (~1,000
lines: `issue`, `derive`, `verify`, `verifyCredential`, presentation helpers,
the `_check*` internals, and the `log` plumbing). Supporting modules:
`helpers.ts` (date/uri regexes and utilities), `CredentialIssuancePurpose.ts`
(the assertionMethod proof purpose), `documentLoader.ts` + `contexts/` (the
built-in `defaultDocumentLoader` and its bundled contexts).

`docs/obv3-legacy-history.md` records legacy Open Badges v3 context history.

### Package Manager

Use `pnpm` (not `npm` or `yarn`). The lockfile is `pnpm-lock.yaml`. Install deps
with `pnpm install`; run scripts with `pnpm run <script>` or `pnpm <script>`.

### Build

The library is built with `tsc` (not `vite build`). `vite.config.ts` exists only
to configure Vitest and to serve TypeScript to Playwright. `pnpm run build`
(`rimraf dist/* && tsc`) compiles `src/` to `dist/` via `tsconfig.json`.

### Lint & format

ESLint + Prettier: `pnpm run lint` checks, `pnpm run fix` auto-fixes (lint +
format). Note `pnpm test` runs lint **before** the node and browser suites, so
running only `pnpm run test-node` can miss lint failures CI would catch.

### Three tsconfigs

- `tsconfig.json` — library build only; `include: ["src/**/*"]`. `strict` and
  `noUncheckedIndexedAccess` are on; `moduleResolution: Bundler`,
  `verbatimModuleSyntax`.
- `tsconfig.dev.json` — extends the above with `noEmit: true`; adds
  `test/**/*.ts`, `vite.config.ts`, `playwright.config.ts` so type-aware checks
  cover all files.

- `test/tsconfig.json` — IDE-only; extends `tsconfig.json` with `noEmit: true`
  and `include: ["**/*.ts", "../src/**/*"]` (the test tree plus `src`, so the
  program matches the build and loads both `src/declarations.d.ts` and
  `test/node/declarations.d.ts`). Exists so the editor's TypeScript language
  service, which walks up from a test file to the nearest `tsconfig.json` (and
  never reads the differently-named `tsconfig.dev.json`), binds test files to a
  config that loads the test ambient declarations. Without it the editor uses the
  root `tsconfig.json` (`src`-only) and reports spurious TS7016 "could not find a
  declaration file" errors for untyped test-only deps. Not referenced by any
  build or CI script.

Do not add test files to `tsconfig.json` — they would be emitted into `dist/`.
The `test` script does **not** run the dev typecheck; run
`npx tsc -p tsconfig.dev.json --noEmit` explicitly to verify test types.

### Tests

- `test/node/` — Vitest (`pnpm run test-node`); the active test suite.
- `test/browser/` — Playwright (`pnpm run test-browser`) via a Vite dev server
  (`pnpm run dev`), mirroring the verification-key package.

The node suite is `test/node/verify.test.ts` (the main issue/verify/derive
suite) plus `test/node/dateRegex.test.ts`. Fixtures are test-local modules, not
`.test.ts` files: `mock-data.ts` (versioned mock credentials), `contexts.ts` +
`documentLoader.ts` (offline context map and loader), and `helpers.ts`.

One non-obvious test convention:

- Most node tests run inside `for (const [version, mockCredential] of
  versionedCredentials)` (`test/node/verify.test.ts`), so each `it(...)` executes
  **twice** (VC 1.0 and 2.0); version-specific cases are gated on `version`. A new
  test added at the top level of that loop counts double in the passing total.

The suite holders in `test/node/verify.test.ts` are the concrete suite classes
(`Ed25519Signature2020`, `DataIntegrityProof`); only the key holders
(`assertionKey`, `ecdsaKeyPair`) stay `any`, because the verification-key and
ecdsa-multikey packages are untyped here. Concrete suites became possible once
`@interop/jsonld-signatures` added `verificationMethod?` to `LinkedDataProof`
(and `issue`/`signPresentation` were retyped to take `LinkedDataProof`, the base
the suites actually extend).

### ESM & import paths

The package is ESM-only (`"type": "module"`). Local imports must use the `.js`
extension even though source files are `.ts` — e.g.
`import { canonize } from './canonize.js'`. `moduleResolution: Bundler` resolves
these to the `.ts` source at compile time.

### Domain types

Import the canonical credential/proof domain types
(`IVerifiableCredential`, `ICredentialSubject`, `ICredentialStatus`, ...) from
`@interop/data-integrity-core` (a runtime dependency) rather than hand-rolling
local equivalents; `src/index.ts` re-exports the public aliases
(`VerifiableCredential`, `VerifiablePresentation`) on top of them. Boundary
params use the shipped jsigs types (`DocumentLoader`, `ProofPurpose`, ...). The
three untyped runtime deps are declared in `src/declarations.d.ts`; untyped
test-only deps in `test/node/declarations.d.ts`.

## Conventions

Code style, refactoring, JSDoc, comment, and error-handling conventions live in
@CONTRIBUTING.md -- follow them.
