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
