# Porting Notes: `@digitalcredentials/vc` → `@interop/vc`

Working log for the effort to fork this library into `@interop/vc`. This file is
**not** auto-loaded into Claude sessions — read it on demand when working on the
port. Keep durable, must-always-apply conventions in `CLAUDE.md` instead; keep
chronological progress and rationale here.

## Goal

Produce `@interop/vc` that:

1. Forks this library (`@digitalcredentials/vc`, the `interop-alliance/vc` repo) to `@interop/vc`.
2. Retains all important `@digitalbazaar/vc` features.
3. Keeps the `@digitalcredentials` (DCC) innovations (notably the fine-grained
   verification result `log`).
4. Is converted to TypeScript.
5. Uses the testing infrastructure and configs from /home/dmitri/code/Interop/isomorphic-lib-template
6. Repoints relevant dependencies to `@interop/*` forks.

## Lineage

- This fork **diverged from `@digitalbazaar/vc` at commit `7cbf534`
  (2021-09-25)**, around DB's v2.0.0.
- As of this writing: DB is at **7.3.0**; this fork is at **10.0.2**.
- The fork had already cherry-picked the big DB feature (VC 2.0:
  `validFrom`/`validUntil`, `checkContextVersion`), plus `derive()`, the `now`
  param, and the ESM conversion, before this effort began.

### Why we started from this fork (not from DB)

The expensive-to-reproduce piece — the **fine-grained result `log`** — is a
cross-cutting concern threaded through `_verifyCredential` and `_checkCredential`
(plus `addStatusInfoToLog` for revocation/suspension). Re-introducing that into
DB's verify core would be invasive. The DB-only gaps, by contrast, were small
and additive. So: start here, port the contained DB features in.

## Progress

### Done — feature ports (all in JS, under `lib/`)

| Item | Summary |
|---|---|
| **WI-1: Remove OBv3 legacy fallback** | Deleted `_verifyOBv3LegacySignature`, `wrapWithLegacyLoader`, `lib/legacyDocumentLoader.js`, the dead `test/mocks/credential-2018.js`, and the `@digitalcredentials/open-badges-context` dep. Removed behavior preserved in `docs/obv3-legacy-history.md`. |
| **WI-2: `maxClockSkew` + `compareTime`** | Added `compareTime()` to `lib/helpers.js`; added `maxClockSkew = 300` param to `issue`/`verify`/`verifyCredential`/`createPresentation`/`_checkCredential`; swapped the 4 raw date comparisons (`expirationDate`, `issuanceDate`, `validUntil`, `validFrom`) for skew-aware `compareTime(...)`. |
| **WI-3: `includeCredentials`** | Gated `credentialResult.credential` attachment in `_verifyPresentation` behind `includeCredentials`, **defaulting `true`** (see decision below). |
| **WI-3: `credentialStatus` arrays** | No code change needed — already supported. Added test coverage only. |

Test count grew 105 → 120 over the effort. `npm run lint` clean throughout.

### Remaining

- **Repoint dependencies** to `@interop/*` forks (consume from the npm registry,
  not pnpm `workspace:`/`link:`/`file:` — per global CLAUDE.md).
- **Convert to TypeScript** and adopt the target toolchain described in
  `CLAUDE.md` (pnpm, Vitest, Playwright, Prettier, `tsc` build, `src/` layout).
  Do this **after** deps are repointed and feature behavior is settled.

The four DB-gap items identified at the start are all closed. The outstanding DB
`jsonld@9` / `jsonld-signatures@11.6` bumps are moot — those deps are being
repointed to `@interop/*` forks anyway.

### Dependency mapping (fork guidance from maintainer)

Repoint these (consume the published npm versions; local checkouts under
`/home/dmitri/code/Interop/` are read-only source references):

| Current dep | Repoint to | Notes |
|---|---|---|
| `@digitalcredentials/jsonld@^9.0.0` | `@interop/jsonld@^9.0.2` | Tracks DB upstream closely. |
| `@digitalcredentials/jsonld-signatures@^12.0.1` | `@interop/jsonld-signatures@^11.6.1` | Follows DB versioning (11.6), not DCC's 12.x. |
| `@digitalbazaar/data-integrity@^2.0.0` (devDep) | `@interop/data-integrity-proof@^3.2.0` | Verify `DataIntegrityProof` API compatibility on swap. |

Leave as-is (no `@interop` forks yet, or intentionally kept):

- The `*-context` deps: `@digitalcredentials/credentials-v2-context`,
  `credentials-context`, `ed25519-signature-2018-context`.
- The `ecdsa-*` libraries (`@digitalbazaar/ecdsa-multikey`,
  `@digitalbazaar/ecdsa-sd-2023-cryptosuite`) — no forks yet; hoped for future.

Drop, migrating to the maintained Ed25519 suites:

- **Ed25519 2018 support**: drop `@digitalbazaar/ed25519-signature-2018` and
  `@digitalbazaar/ed25519-verification-key-2018`. Used in
  `test/10-verify.spec.js`, `test/contexts/index.js`, `test/mocks/mock.data.js`.
  **Migrate those tests to the `@interop/ed25519-signature@^7.0.0` Multikey and
  2020 suites** (with keys from `@interop/ed25519-verification-key@^7.0.1`) --
  these are the Ed25519 suites the maintainer most wants exercised. Since the
  test suite is rebuilt in Phase B (Vitest), do this removal + migration
  **there**, not as throwaway work against the mocha suite.

Test-infra forks (for borrowing test harness from `@digitalbazaar/vc` during the
Phase B test rebuild):

- `@digitalbazaar/ed25519-signature-2020`/`-2018` -> `@interop/ed25519-signature`
  (Multikey + 2020 suites)
- `@digitalbazaar/ed25519-verification-key-*` -> `@interop/ed25519-verification-key`
- `@digitalbazaar/did-io` -> `@interop/did-io`
- `@digitalbazaar/did-method-key` -> `@interop/did-method-key`
- `@digitalbazaar/did-method-web` -> `@interop/did-web-resolver`
- `@digitalbazaar/security-document-loader` -> `@interop/security-document-loader`

### Phasing

- **Phase A (JS + mocha, low-risk): DONE.** Swapped the production deps
  (`jsonld`, `jsonld-signatures`) and the `data-integrity` devDep, updating
  imports in `lib/` and `test/`. `@interop/data-integrity-proof` exports
  `DataIntegrityProof` compatibly. All 120 mocha tests pass; lint clean. The
  2018 drop is deferred to Phase B.
- **Phase B (TS + toolchain):** JSDoc-deepen the existing (shallow `{object}`)
  types under `checkJs`, then mechanical `.js -> .ts`; adopt the
  isomorphic-lib-template toolchain (pnpm/Vitest/Playwright/Prettier/tsc,
  `src/` layout); rebuild test infra (borrowing from `@digitalbazaar/vc`, on the
  `@interop` test-infra forks above); drop Ed25519 2018 during the rebuild.

#### Phase B sub-phases (execute one at a time, stop at each gate)

Reference implementation: `@interop/data-integrity-proof` (sibling fork already
on this toolchain; same `src/` + `test/{node,browser}` layout).

- **B1 -- JSDoc-deepen (stays JS + mocha, green). DONE.** Deepened the shallow
  typedefs in `lib/index.js`: `VerifiableCredential`/`VerifiablePresentation` now
  alias `@interop/data-integrity-core`'s `IVerifiableCredential`/
  `IVerifiablePresentation` (added `@interop/data-integrity-core@^6.1.0` as a
  type source -- currently referenced only via JSDoc `import(...)`, becomes an
  `import type` in B2); added `LogEntry` and fleshed out
  `VerifyCredentialResult`/`VerifyPresentationResult`. Fixed genuine JSDoc syntax
  errors (`@typedef ErrorConstructor` -> `Error`; `@throws` splitting the
  `options.*` param chain in `_verifyCredential`; malformed
  `@returns {Promise<{VerifiablePresentation}>}`). Added throwaway
  `tsconfig.checkjs.json` + `typescript` devDep for the check.

  **Gate adjustment:** a literally-clean `tsc --checkJs` is NOT the right bar
  pre-conversion. `@interop/jsonld-signatures` ships types, so `checkJs` type-checks
  every `jsigs.*` call and (via TS's weak JS inference) flags the `= {}`
  destructuring-default on every exported function. The ~34 residual diagnostics
  are all in three buckets, each properly resolved in B2 (not by contorting JS):
  1. `= {}` destructuring-default artifact -> define real *option interfaces*
     (all-optional fields) in B2.
  2. jsigs upstream-type interop (`Function` vs `DocumentLoader`,
     `AuthenticationProofPurpose` needs `term`, `validate` override variance,
     custom `error.log`/`result.log`) -> typed signatures/casts in B2.
  3. `compareTime` typed `{number}` but called with `Date` -> use `.getTime()`
     coercion in real `.ts` (half-fixing in JSDoc just moves the error into the
     body). Realized gate: typedefs deepened, real JSDoc errors fixed, residue
     categorized, **120/120 mocha + old lint clean**.
- **B2 -- mechanical `.js -> .ts`, move `lib/ -> src/`. DONE.** Converted all
  five modules to `src/*.ts`, collapsing JSDoc into inline types. Defined option
  interfaces (`IssueCredentialOptions`, `VerifyCredentialOptions`,
  `VerifyPresentationOptions`, etc. -- all fields optional, which is what makes
  the `= {}` default valid: bucket 1 resolved). Used the jsigs shipped types
  (`DocumentLoader`, `LinkedDataProof`/`LinkedDataSignature`, `ProofPurpose`,
  `ProofValidateResult`) for the boundary params, and `IVerifiableCredential` /
  `IVerifiablePresentation` / `ICredentialSubject` from data-integrity-core for
  the data shapes (bucket 2 resolved; `error.log`/`result.log` typed via an
  `ErrorWithLog` alias and `VerifyCredentialResult.log`). `compareTime` now
  coerces with `Number()` (bucket 3). `src/declarations.d.ts` declares the three
  untyped deps (`@interop/jsonld`, `credentials-context`,
  `credentials-v2-context`); jsigs/data-integrity-core keep their shipped types.
  Added template `tsconfig.json`; removed throwaway `tsconfig.checkjs.json`.
  Two residual jsigs-type casts: `AuthenticationProofPurposeOptions` is typed as
  requiring `term` (upstream quirk; the class sets it), cast at the two call
  sites; jsigs `verify`/`sign` call args spread `...options` so are cast `as any`
  at those boundaries. Gate: `tsc` compiles `src/ -> dist/` **0 errors**, full
  `.d.ts` emitted, runtime ESM load + public API surface verified. (The mocha
  suite is now red -- it imports the deleted `lib/`; rebuilt on Vitest in B4.)
- **B3 -- toolchain swap. DONE.** Added template configs (`eslint.config.js`,
  `prettier.config.js`, `tsconfig.dev.json`, `vite.config.ts`,
  `playwright.config.ts`; template `.gitignore`/`.editorconfig`). Rewrote
  `package.json`: renamed `@digitalcredentials/vc` -> `@interop/vc`,
  `exports`->`dist` (`types`/`react-native`/`import`), pnpm template scripts,
  `engines.node >= 24.0`, `packageManager pnpm@11.3.0`; devDeps swapped to the
  toolchain set (eslint 10 + typescript-eslint + prettier, vitest 4, playwright,
  vite 8, rimraf, `@types/node`); runtime `dependencies` trimmed to the 5 actually
  imported by `src/` (`@interop/{jsonld,jsonld-signatures,data-integrity-core}`,
  `credentials-context`, `@digitalcredentials/credentials-v2-context`) --
  dropped `ed25519-signature-2018-context` (only ever a test dep, not imported in
  `src/`). Deleted `karma.conf.cjs`, `.eslintrc.cjs`, `package-lock.json`. `pnpm
  install` auto-created `pnpm-workspace.yaml` with a `minimumReleaseAgeExclude`
  entry for `@interop/data-integrity-core@6.1.0` (loose mode). Lint scope: the
  flat eslint config `globalIgnores` the legacy mocha `test/**/*.js` (dead until
  the B4 Vitest rebuild), so `eslint src test` only sees the TS toolchain. Other
  test-fixture/infra devDeps (ecdsa-*, ed25519-*, did-*, data-integrity-context,
  uuid, klona, security-document-loader, `@interop/data-integrity-proof`) were
  NOT carried over; B4 re-adds exactly what the rebuilt Vitest suite needs. Gate:
  `pnpm run build` (tsc, 0 errors, full `.d.ts` emitted) + `pnpm run lint`
  (0 problems) clean; `dist/index.js` runtime-loads with the full public API.
- **B4 -- Vitest migration (`test/node/`). DONE.** Rebuilt the mocha+chai suite
  as Vitest `.ts` under `test/node/`: `verify.test.ts` (port of
  `10-verify.spec.js`), `dateRegex.test.ts`, plus fixtures `mock-data.ts`
  (`versionedCredentials` + inline `@vocab` example contexts), `contexts.ts`
  (the malformed negative-test contexts), `helpers.ts`, `documentLoader.ts`, and
  `declarations.d.ts`. **120/120 passing** (same count as the old suite).
  Dropped Ed25519 2018 entirely; the signing keys are now `@interop/ed25519-
  verification-key` Multikey keys.
  - **Suite choices (both the maintainer's wanted suites exercised):** VCs are
    issued/verified with `Ed25519Signature2020` (from `@interop/ed25519-
    signature`). **Presentations** are signed with the modern eddsa-rdfc-2022
    `DataIntegrityProof` Multikey suite -- *not* 2020 -- because the VC 2.0
    context defines proof terms like `challenge` only under the
    `DataIntegrityProof` type scope, so a 2020-typed VP proof drops `challenge`
    under JSON-LD safe mode (`jsonld.ValidationError`). Signed-VP verification
    therefore passes a `[Ed25519Signature2020, DataIntegrityProof(eddsaRdfc2022)]`
    suite array (inner VC proof + outer VP proof).
  - **VeresOne dropped.** `did-veres-one`/`VeresOneDriver` is gone (maintainer
    confirmed VeresOne is not needed). Issuers are now `did:key` DIDs, resolved
    automatically by `@interop/security-document-loader`'s `securityLoader()`
    (which also bundles the credentials v1/v2, DID, Ed25519-2020, Multikey, and
    data-integrity contexts). `CredentialIssuancePurpose` requires the credential
    `issuer` to equal the verification method's controller, so issue+verify tests
    set `credential.issuer` to the generated `did:key`.
  - **Document loader.** `documentLoader.ts` wraps `securityLoader()` (adding the
    example + malformed contexts statically) behind a mutable `remoteDocuments`
    map so individual tests can register ad-hoc docs -- used to register the
    ECDSA-SD controller/key docs (the ecdsa-sd-2023 derive tests are retained,
    still using `@digitalbazaar/ecdsa-multikey` + `ecdsa-sd-2023-cryptosuite` +
    `@interop/data-integrity-proof`).
  - **Test devDeps re-added** (B3 had trimmed all test fixtures): `@interop/{ed25519-
    signature,ed25519-verification-key,did-method-key,security-document-loader,
    data-integrity-proof}`, `@digitalbazaar/{ecdsa-multikey,ecdsa-sd-2023-
    cryptosuite}`, `uuid`/`@types/uuid`. The two untyped `@digitalbazaar/ecdsa-*`
    packages are declared in `test/node/declarations.d.ts`.
  - **Test types.** Under `strict` + `noUncheckedIndexedAccess`, the freely-mutated
    mock credentials and suites are typed `any` at the boundary (the
    `@interop/ed25519-signature` `date: Date|null` vs lib `Date|undefined`
    variance -- see "Upstream to-dos" below -- and dynamic `verify()` result
    shapes), matching the pragmatic style of the `data-integrity-proof` reference
    suite.
  - **`pnpm install` (loose mode)** auto-added 8 `minimumReleaseAgeExclude` entries
    to `pnpm-workspace.yaml` for the recently-published `@interop/*` deps
    (including transitive `did-io`/`did-web-resolver`). Flag for the user per
    global CLAUDE.md.
  - Gate: `pnpm run test-node` green (120/120), `tsc -p tsconfig.dev.json
    --noEmit` clean, `pnpm run lint` + `pnpm run build` clean.
- **B5 -- Playwright smoke (`test/browser/`). DONE.** Added the browser test
  harness mirroring the `@interop/data-integrity-proof` reference: `test/index.html`
  (empty-body dev page), `test/browser/roundtrip.entry.ts` (a `runRoundtrip()` that
  generates a `did:key` Ed25519 issuer, issues a VC 2.0 with `Ed25519Signature2020`,
  then verifies it -- mirrors the "should verify a vc" Node test), and
  `test/browser/roundtrip.spec.ts` (Playwright drives Chromium, `page.evaluate`
  imports the Vite-served entry URL and asserts `hasProof` + `verified`, and fails
  on any `pageerror`). The entry reuses the Node `documentLoader.ts`/`mock-data.ts`
  fixtures; bare `@interop/*` specifiers are rewritten by the Vite dev server when
  it serves the entry module (which is why the spec imports the served URL rather
  than importing packages directly in `page.evaluate`). No `vite.config.ts` alias
  needed: unlike data-integrity-proof, this lib has no `node:crypto`/sha256 browser
  swap of its own -- the crypto lives in the suite deps, which ship their own
  browser variants. The absolute-URL dynamic import (`/test/browser/roundtrip.entry.ts`)
  is not a tsc-resolvable module path; the reference repo lives with the resulting
  `tsc` error, but to keep this project's `tsc -p tsconfig.dev.json --noEmit` gate
  clean it carries a single `// @ts-expect-error`. Gate: `pnpm run test-browser`
  green (1 passed), and node (120/120) + dev typecheck + lint + build all still clean.
- **B6 -- cleanup + docs. DONE.** Repointed the README to `@interop/vc`
  (title/badge, install via `pnpm`, Node 24+, ESM `import * as vc` instead of
  the old `require(...)`, the Ed25519 suite/key imports to
  `@interop/ed25519-signature` + `@interop/ed25519-verification-key`,
  `@digitalbazaar/data-integrity` -> `@interop/data-integrity-proof`,
  `@digitalcredentials/security-document-loader` ->
  `@interop/security-document-loader`; kept the `@digitalbazaar/ecdsa-sd-2023-
  cryptosuite` refs since there's no `@interop` fork; rewrote the Testing section
  for Vitest/Playwright/`pnpm test`). Flipped `CLAUDE.md`'s "Current status"
  bullets to "port complete" (pnpm / Vitest+Playwright / template ESLint+Prettier
  / TypeScript). CHANGELOG: renamed the heading to `@interop/vc`, added Unreleased
  "Changed" entries for the package rename, the TypeScript conversion, and the
  toolchain adoption, plus a "Removed" entry for dropping
  `ed25519-signature-2018-context`. CI: replaced the npm/mocha/karma `main.yml`
  with the template `ci.yml` (pnpm, Node 24, lint+build+test-node+Playwright) and
  added `publish.yml` (npm trusted publishing on GitHub release); removed the dead
  DCC-org `issues-to-project.yml`. BACKGROUND.md left as-is (conceptual key/suite
  primer inherited from upstream). Gate: full `pnpm test` green (lint clean,
  120/120 node, 1/1 browser); `pnpm run build` + `tsc -p tsconfig.dev.json
  --noEmit` clean.

### Phase B complete

All six sub-phases (B1-B6) are done. `@interop/vc` is TypeScript (`src/` ->
`dist/` via `tsc`), on the isomorphic-lib-template toolchain (pnpm, Vitest,
Playwright, Prettier, template ESLint), with deps repointed to `@interop/*`.
The former open item (concrete suite types in the test suite) is now resolved --
see "Upstream to-dos" below.

#### Upstream to-dos (other `@interop/*` repos)

- **DONE -- typed suite holders concrete (jsigs `LinkedDataProof` +
  `issue`/`signPresentation` retype).** The original plan here was to widen
  `LinkedDataSignature.date` to `Date | null` in `@interop/jsonld-signatures`,
  on the theory that the `date` mismatch was the only blocker. Investigation
  showed that was necessary but **not sufficient**: the real suites
  (`Ed25519Signature2020`, `DataIntegrityProof`, the ecdsa-sd-2023 suites) all
  extend jsigs `LinkedDataProof`, *not* `LinkedDataSignature`, and after a
  `date` fix the next blockers surfaced (`DataIntegrityProof.sign` /
  `verifySignature` use `IProofDescription`/`IDocumentLoader` vs jsigs'
  `object`/`DocumentLoader`, and it has no `getVerificationMethod`) --
  `DataIntegrityProof` simply is not a `LinkedDataSignature`. The fix taken:
  - `@interop/jsonld-signatures` (types only): added `verificationMethod?: string`
    to the `LinkedDataProof` base class and widened `LinkedDataSignature.date`
    (and the constructor option) to `Date | null`. Runtime unchanged.
  - `@interop/vc`: retyped `IssueCredentialOptions.suite` and
    `SignPresentationOptions.suite` from `LinkedDataSignature` to
    `LinkedDataProof` (the base the modern suites actually extend; `issue()`
    reads `suite.verificationMethod`, which is why `LinkedDataProof` needed that
    field). The `test/node/verify.test.ts` suite holders are now the concrete
    suite classes; only the key holders (`assertionKey`, `ecdsaKeyPair`) stay
    `any` (untyped key packages).

  Sequencing: `@interop/vc` consumes jsigs from the npm registry, so its type
  changes only compile once the new `@interop/jsonld-signatures` is published and
  pulled in (the `^11.6.2` range picks up the next patch/minor on
  `pnpm install`). Verified locally against a mirrored copy of the jsigs change
  in `node_modules`.

#### Phase B decisions (from maintainer)

- **Domain types:** import canonical types (`IVerifiableCredential`,
  `ICredentialStatus`, `IProofDescription`, `ISigner`, ...) from
  `@interop/data-integrity-core@^6.1.0` (add as a runtime dependency) rather than
  hand-rolling local types.
- **Package rename:** rename `name` `@digitalcredentials/vc` -> `@interop/vc` in
  B3 (user publishes manually).
- **Node target:** match the template -- `engines.node >= 24`, template devDep
  versions verbatim.
- **Cadence:** stop at each sub-phase gate for go-ahead.

## Lessons learned / non-obvious findings

- **`credentialStatus` arrays already worked.** `_checkCredential` validates via
  `jsonld.getValues(credential, 'credentialStatus').forEach(...)`, which
  normalizes a single object or an array to an array — this *is* the mechanism
  behind DB's 6.2.0 "allow credentialStatus arrays" change. All
  `if(credential.credentialStatus)` guards are truthy for arrays too. So the
  "port" was test coverage, not code.

- **`includeCredentials` defaults to `true` here, diverging from upstream
  (`false`).** This fork has attached `credentialResult.credential`
  unconditionally since DCC 10.0.0. A consumer audit showed
  `@digitalcredentials/verifier-core` (`src/Verify.ts:70`) feeds
  `credentialResult.credential` straight into `transformResponse(...)` and does
  **not** pass `includeCredentials`. `transformResponse` hard-depends on the
  credential (issuer registry lookup, schema check, signature-error handling,
  and it re-attaches `credential` to its output). `web-verifier-plus` and
  `learner-credential-wallet` both reach this through verifier-core; neither
  reads `credentialResults` directly. Defaulting `false` would set
  `credential = undefined` and break all three. Defaulting `true` preserves them
  while still offering DB's opt-out. **Do not "fix" this to match upstream.**

- **Test files loop over `versionedCredentials`.** In `test/10-verify.spec.js`,
  most tests run inside `for(const [version, mockCredential] of
  versionedCredentials)`, so each `it(...)` executes twice (VC 1.0 and 2.0).
  Version-specific cases are gated with `if(version === 1.0)` /
  `if(version === 2.0)`. New tests added at the top level of that loop will
  count double in the passing total.

## Working conventions (from global CLAUDE.md)

- Do not bump `package.json` version (the user releases manually).
- New `CHANGELOG.md` entries use `TBD` as the date.
- Consume `@interop/*` forks from the npm registry, not workspace/link/file refs.
  Local checkouts under `/home/dmitri/code/Interop/` are for reading source only.
- Lockfile / `minimumReleaseAge` issues: flag to the user, don't resolve.
