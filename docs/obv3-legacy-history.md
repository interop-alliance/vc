# OBv3 Legacy BETA Signature Fallback — Removal History

This document preserves the OBv3 (Open Badges v3) legacy BETA signature
fallback that was removed from this library, in case forensic archaeology is
ever needed. It was removed as part of the `@interop/vc` fork prep (WI-1).

## What it did

Open Badges v3 went through a BETA period before the context was finalized.
During that BETA, credentials were issued against the *unversioned* context URL
`https://purl.imsglobal.org/spec/ob/v3p0/context.json`. After the spec
finalized, that URL's served document changed, which meant the document loader
would fetch a *different* context than the one the BETA credential was signed
against. Because JSON-LD signature verification is sensitive to the exact
context used during canonicalization, those legacy BETA VCs would fail normal
signature verification.

The fallback worked around this: if a credential failed initial verification
**and** its `@context` array included the unversioned OBv3 context URL, the
library would retry verification using a wrapped document loader that
substituted a pinned, locally-bundled copy of the OBv3 BETA context
(`CONTEXT_URL_V3_BETA` from `@digitalcredentials/open-badges-context`).

## Why it was removed

- It special-cased a now-obsolete pre-final OBv3 BETA context.
- It was the only consumer of the `@digitalcredentials/open-badges-context`
  dependency.
- It had **no live test coverage** — the only fixture (`credential-2018.js`)
  was a CommonJS module never imported by any test.
- It added a cross-cutting branch and a second `jsigs.verify` path to the core
  `_verifyCredential` flow, complicating the upcoming TypeScript conversion.

## Removed code

### `lib/legacyDocumentLoader.js` (entire file, deleted)

```js
/*!
 * Copyright (c) 2023 Digital Credentials Consortium. All rights reserved.
 */

import obCtx from '@digitalcredentials/open-badges-context';

export default function wrapWithLegacyLoader(existingLoader) {
  return async function documentLoader(url) {
    if(url === 'https://purl.imsglobal.org/spec/ob/v3p0/context.json') {
      return {
        contextUrl: null,
        documentUrl: url,
        document: obCtx.contexts.get(obCtx.CONTEXT_URL_V3_BETA)
      };
    }

    return existingLoader(url);
  };
}
```

### `lib/index.js` — import (removed)

```js
import wrapWithLegacyLoader from './legacyDocumentLoader.js';
```

### `lib/index.js` — fallback branch inside `_verifyCredential` (removed)

The branch below replaced what is now a simple
`if(!result.verified) { return result; }`:

```js
  if(!result.verified) {
    const contexts = credential['@context'];
    // Custom processing to handle legacy OBv3 BETA VCs
    if(Array.isArray(contexts) && contexts
      .includes('https://purl.imsglobal.org/spec/ob/v3p0/context.json')) {

      result = await _verifyOBv3LegacySignature(credential,
        {purpose, documentLoader, ...options});
    }

    // if verification has already failed, skip status check
    if(!result.verified) {
      return result;
    }
  }
```

### `lib/index.js` — `_verifyOBv3LegacySignature` helper (removed)

```js
async function _verifyOBv3LegacySignature(credential,
  {purpose, documentLoader, ...options}) {
  let result;

  const legacyLoader = wrapWithLegacyLoader(documentLoader);
  try {
    result = await jsigs.verify(
      credential, {purpose, documentLoader: legacyLoader, ...options});
  } catch(error) {
    error.log = error.log &&
      error.log.push({id: 'valid_signature', valid: false});
    throw error;
  }

  return result;
}
```

### `package.json` — dependency (removed)

```json
"@digitalcredentials/open-badges-context": "^2.1.0",
```

### `test/mocks/credential-2018.js` (entire file, deleted)

A CommonJS fixture for an OBv3 BETA `OpenBadgeCredential` signed with
`Ed25519Signature2018`. It was never imported by any test. Preserved here:

```js
/* eslint-disable */
const credential2018 = {
  "issuer": {
    "type": [
      "profile"
    ],
    "id": "did:key:z6Mkn957Vwed2zBLLZkYiDgoha3cm1KtSE3PeAryJf3T7Vwz",
    "name": "K-Pop"
  },
  "type": [
    "VerifiableCredential",
    "OpenBadgeCredential"
  ],
  "credentialSubject": {
    "type": [
      "AchievementSubject"
    ],
    "id": "mailto:jdoe@example.com",
    "name": "John Doe",
    "achievement": {
      "type": [
        "Achievement"
      ],
      "name": "Energizer Award",
      "description": "Awarded to John Doe."
    }
  },
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    "https://purl.imsglobal.org/spec/ob/v3p0/extensions.json"
  ],
  "issuanceDate": "2024-01-23T16:36:00.714Z",
  "proof": {
    "type": "Ed25519Signature2018",
    "created": "2024-01-23T16:36:01Z",
    "verificationMethod": "did:key:z6Mkn957Vwed2zBLLZkYiDgoha3cm1KtSE3PeAryJf3T7Vwz#z6Mkn957Vwed2zBLLZkYiDgoha3cm1KtSE3PeAryJf3T7Vwz",
    "proofPurpose": "assertionMethod",
    "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..VgsJqZGkkT-Mbn20-g7nY4UsTCjmGc96J47rJJ3BTq60sU-3C3L8BIoI75nsfvlbKGz3TehSztnF1fkxlgCSCg"
  }
};

module.exports = credential2018;
```

## Behavioral change after removal

VCs using the unversioned OBv3 BETA context
(`https://purl.imsglobal.org/spec/ob/v3p0/context.json`) no longer receive a
special-cased re-verification pass. They now follow the standard verification
path like any other credential. All other behavior is unchanged.
