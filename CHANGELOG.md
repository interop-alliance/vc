# @interop/vc ChangeLog

## 11.0.4 - 2026-06-13

### Changed
- Update to latest `@interop/data-integrity-core@8.0.0` and related.

## 11.0.3 - 2026-06-09

### Changed
- Update to latest `@interop/data-integrity-core@7.0.0` and related.

## 11.0.2 - 2026-06-06

### Added

- Add default export to `package.json`.


## 11.0.1 - 2026-06-02

### Changed
- Type the `suite` parameter of `issue()` and `signPresentation()` as
  jsonld-signatures' `LinkedDataProof` (was `LinkedDataSignature`), matching the
  other verify/derive APIs and the base class the modern Data Integrity suites
  (`Ed25519Signature2020`, `DataIntegrityProof`) actually extend. Requires
  `@interop/jsonld-signatures` >= the release that adds `verificationMethod?` to
  `LinkedDataProof`.

## 11.0.0 - 2026-06-02

### Changed
- **BREAKING**: Fork, rename the package from `@digitalcredentials/vc@10` to `@interop/vc@11`.
- **Convert the library to TypeScript.** Source moved from `lib/*.js` to
  `src/*.ts` (built to `dist/` with `tsc`); the public API now ships `.d.ts`
  types. Domain types (`VerifiableCredential`, `VerifiablePresentation`, ...)
  are sourced from `@interop/data-integrity-core`. The package is ESM-only.
- **Adopt the isomorphic-lib-template toolchain.** Switched the package manager
  to `pnpm` (lockfile `pnpm-lock.yaml`); replaced Mocha/Chai with Vitest
  (`test/node/`) and Karma with Playwright (`test/browser/`); replaced the
  Digital Bazaar ESLint config with the template ESLint + Prettier setup;
  bumped `engines.node` to `>= 24`.
- Repoint dependencies to `@interop/*` forks: `@digitalcredentials/jsonld` to
  `@interop/jsonld@^9.0.2`, and `@digitalcredentials/jsonld-signatures` to
  `@interop/jsonld-signatures@^11.6.1`. The `@interop/jsonld-signatures` fork
  follows Digital Bazaar's `11.6.x` versioning rather than DCC's `12.x`. The
  `*-context` dependencies are unchanged. (Test dev dependency
  `@digitalbazaar/data-integrity` likewise repointed to
  `@interop/data-integrity-proof@^3.2.0`.)

### Added
- Add `includeCredentials` option to `verify()`: when verifying a presentation,
  each entry in `credentialResults` includes its source `credential`. Ported
  from `@digitalbazaar/vc@7.3.0`, but **defaults to `true`** (rather than `false`
  as upstream) to preserve this fork's existing behavior of always attaching the
  credential; pass `includeCredentials: false` to omit them.
- Add test coverage confirming `credentialStatus` may be an array (already
  supported by the `_checkCredential` validation, which validates every entry).
- Add `maxClockSkew` parameter (default `300` seconds) to `issue()`, `verify()`,
  `verifyCredential()`, and `createPresentation()`. Date-time checks
  (`expirationDate`/`issuanceDate` for VC 1.0, `validFrom`/`validUntil` for
  VC 2.0) now tolerate clock skew up to `maxClockSkew`, fixing spurious failures
  in decentralized systems where clocks are not perfectly in sync. Ported from
  `@digitalbazaar/vc@7.3.0`.

### Removed
- Drop the `ed25519-signature-2018-context` dependency. It was only ever used by
  the test suite (never imported by the library), and the test suite no longer
  exercises the Ed25519 2018 suite -- VCs are now issued/verified with
  `Ed25519Signature2020` (Multikey keys from `@interop/ed25519-verification-key`)
  and presentations with the eddsa-rdfc-2022 `DataIntegrityProof` suite.
- Remove the legacy OBv3 BETA signature verification fallback
  (`_verifyOBv3LegacySignature`, `wrapWithLegacyLoader`, and
  `lib/legacyDocumentLoader.js`), along with the now-unused
  `@digitalcredentials/open-badges-context` dependency. VCs using the
  unversioned OBv3 BETA context
  (`https://purl.imsglobal.org/spec/ob/v3p0/context.json`) are now verified via
  the standard path. The removed behavior is preserved in
  `docs/obv3-legacy-history.md`.

## 10.0.2 - 2025-11-19

### Changed
- Fix `createPresentation` throwing expiration error when `verify: false`.

## 10.0.1 - 2025-10-02

### Changed
- Add a parameter to `createPresentation` to allow VC verification to be optional.
  Addresses issue #32. Does not change current default behavior.

## 10.0.0 - 2025-04-30

### Changed
- **BREAKING**: Removes CJS build

### Fixed
- move status check before expiry check because expiry check throws error that had prevented the status check from running
- attach the credential to the verification result for each credential submitted as part of a VP verification

## 9.0.1 - 2024-09-30

### Fixed
- add signature checks to the log before running other verification checks whose errors might prevent that logging

## 9.0.0 - 2024-09-17

### Changed
- **BREAKING**: The dependency `@digitalcredentials/jsonld-signatures@12.0.0` (via `@digitalcredentials/ed25519-signature-2020`)
  now requires `expo-crypto` for React Native sha256 digest hashing, instead of
  `@sphereon/isomorphic-webcrypto@2.5.0-unstable.0`.
  - **IMPORTANT**: This means that IF you're using this library inside a React Native project, you MUST include `expo-crypto`
    in your project's `dependencies`.

## 8.0.1 - 2024-09-04

### Fixed
- Fix stray Error object in `CredentialIssuancePurpose`.

## 8.0.0 - 2024-08-04

### Added
- Add support for VC 2.0 Verifiable Credentials issuance and verification.
- Add support for VC 2.0 Verifiable Presentations issuance and verification.
- Add support for VC 2.0 `validFrom` and `validUntil`.
- Add Test vectors for VC 2.0 VCs & VPs.
- Allow `credentialStatus` arrays in credential status check.
- Add `derive()` API for deriving new verifiable credentials from
  existing ones, for the purpose of selective disclosure or
  unlinkable presentation.
- Add optional param `now` to `verifyCredential()`, `createPresentation()`,
  `verify()`, and `issue()`.

### Changed
- **BREAKING**: Switch dependencies to:
  - `@digitalcredentials/jsonld`
  - `@digitalcredentials/jsonld-signatures`
  - `@digitalcredentials/http-client`
- **BREAKING**: Default issuance now uses VC 2.0 context.
- **BREAKING**: DateTime validator is now an xml schema DateTime validator.
- Change `engines.node` to `>=18` to support newer keys & suites.
- Update dependencies.
  - **BREAKING**: Remove support for `expansionMap`. (Removed in dependencies.)
- **BREAKING**: Use `jsonld-signatures@11` and `jsonld@8` to get new `safe`
  mode (and on by default when using `canonize`) feature.
- **BREAKING**: Check if credential has expired when `expirationDate` property
  exists.
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Require Node.js >=14.
- Update dependencies.
  - **BREAKING**: `did-veres-one@15.0.0` used in tests.
- Lint module.

### Fixed
- Ensure that `issuanceDate` is only checked on verification,
  not issuance.
- Fix bug with option overrides for verifying presentations.

### Removed
- **BREAKING**: Remove ODRL and VC examples contexts from `./lib/contexts/` and
  from the default document loader. The contexts are now available in
  [`@digitalbazaar/odrl-context`](https://github.com/digitalbazaar/odrl-context)
  and
  [`@digitalbazaar/credentials-examples-context`](https://github.com/digitalbazaar/credentials-examples-context).

## 7.0.0 - 2024-02-07
### Changed
* Switch to DigitalBazaar's `jsonld`, `http-client` and `rdf-canonize` libs
* Switch to Sphereon's fork of `isomorphic-webcrypto`

## 6.0.1 - 2024-01-23
### Changed
- Update to use latest OBv3 context in tests
- Add a test for verifying a 2018-signed VC.

## 6.0.0 - 2023-06-16
### Changed
- **BREAKING**: Add a fallback/override for legacy OBv3 VCs.

## 5.0.0 - 2022-11-03

### Changed
- **BREAKING**: Remove check if `issuanceDate` is not in the future as this is
  a fully expected use-case (to issue credentials that become valid at some
  point in time).

## 4.2.0 - 2022-10-19

### Fixed
- **BREAKING**: For `verify()` and `verifyCredential()`, if an error is encountered,
  re-throw it (do not return it as part of the results log).

## 4.1.1 - 2022-07-06

### Fixed
- Remove use of `URL.protocol` (not implemented in React Native).

## 4.1.0 - 2022-07-06

### Added
- Add fine grained verification event `log` parameter to `verifyCredential()`
  results.

## 4.0.0 - 2022-07-06

### Changed
- **BREAKING**: Check if credential has expired when `expirationDate` property
  exists.

### Added
- Add optional param `now` to `verifyCredential()`, `createPresentation()`,
  `verify()`, and `issue()`.

### Fixed
- Check if credential has expired if `expirationDate` property exists.

## 3.0.0 - 2022-xx-xx

Version skipped to match upstream.

## 2.1.0 - 2021-xx-xx

### Changed
- Sync VC example context from vc-data-model spec source.

## 1.1.2 - 2022-02-02

### Changed
- Refactor _validateUriId (remove protocol check - unsupported by RN).

## 1.1.1 - 2021-09-25

### Changed
- Fix validation of `credentialSubject.id`, `issuer` and `evidence` --
  if it's not a URI, reject the credential.
- **BREAKING**: No longer pass in custom parameters to `issue()`.

### Added
- If `issuanceDate` is not set, default to `now()` on issuing.

## 1.0.1 - 2021-09-20

### Changed
- Remove use of runtime `esm` compiler for TypeScript and ReactNative compat.

## 1.0.0 - 2021-04-22

### Changed
- **BREAKING**: Rename library to `@digitalbazaar/vc`.
- Update dependencies.

### Removed
- **BREAKING**: Remove typescript def generation support.
- **BREAKING**: No longer shipping browser bundles.
- **BREAKING**: Move binaries from `bin/` to `@digitalbazaar/vc-js-cli`.

## 0.6.4 - 2020-05-22

### Added
- The results from verifying a presentation now includes `credentialId` which
  makes it possible to correlate success/failure messages with credentials.

## 0.6.3 - 2020-05-14

### Fixed
- Improve error reporting when `suite` parameter is missing.

## 0.6.2 - 2020-05-04

### Fixed
- Accept string value for a single VP context.

## 0.6.1 - 2020-05-01

### Fixed
- Fix reporting of `credentialResults` in `verify` output.

## 0.6.0 - 2020-04-29

### Added
- Add `checkStatus` option. This is a function that can be passed that
  will be executed when a VC has a `credentialStatus` attribute.

## 0.5.0 - 2020-03-26

### Changed
- `verifiableCredential` param is now optional in `createPresentation()`.
- **BREAKING**: `verify()` now only verifies presentations, not credentials,
  (since that will be the most common use case). For credentials, a separate
  `verifyCredential()` method has been added.
- **BREAKING**: Rename `verify()`'s `purpose` parameter to
  `presentationPurpose`.

## 0.4.1 - 2020-02-20

### Changed
- Multiple types for a VerifiableCredential no longer required (fix).
- Multiple `@context`s for a VC no longer required (fix).

## 0.4.0 - 2020-02-14

### Changed
- **BREAKING**: For VerifiablePresentations, break the async
  `createPresentation()` API into two separate calls:
  a **sync** `createPresentation()` and an async `signPresentation()`.
- **BREAKING**: Change default proof purpose for VerifiablePresentations
  from `assertionMethod` to `authentication`.
- **BREAKING**: A `challenge` param is required when verifying a VP.

### Added
- Add support for optionally verifying unsigned presentations.

## 0.3.0 - 2020-01-28

### Changed
- Update docs.
- Evidence IDs are now optional.
- Update webpack build.
- Cleanups.
- Use `credentials-context` package.
- Update dependencies.
- **BREAKING**: Add further checks for controller, suite and assertionMethod

### Removed
- **BREAKING**: Node.js v6 support.

## 0.2.0 - 2019-08-07

### Added
- Export `defaultDocumentLoader` in main vc.js.

## 0.1.0 - 2019-08-07

### Added
- Initial version. See git history for changes.
