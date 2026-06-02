/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Mock credentials and example contexts used across the verification tests.
 * `versionedCredentials` returns a fresh, unsigned credential for each VC Data
 * Model version (1.0 and 2.0) so tests can mutate it freely.
 */

export interface MockCredential {
  '@context': unknown[]
  id: string
  type: string[]
  issuer: string
  issuanceDate?: string
  validFrom?: string
  validUntil?: string
  expirationDate?: string
  credentialSubject: Record<string, unknown> | Record<string, unknown>[]
  credentialStatus?: unknown
  evidence?: unknown
  [key: string]: unknown
}

export const EXAMPLES_V1_CONTEXT_URL =
  'https://www.w3.org/2018/credentials/examples/v1'
export const EXAMPLES_V2_CONTEXT_URL =
  'https://www.w3.org/ns/credentials/examples/v2'

// Minimal example contexts: an open `@vocab` so any example term resolves.
export const examplesV1Context = {
  '@context': {
    '@vocab': 'https://www.w3.org/2018/credentials/examples#'
  }
}
export const examplesV2Context = {
  '@context': {
    '@vocab': 'https://www.w3.org/ns/credentials/examples#'
  }
}

// Typed as `any` factories so tests can freely mutate the returned objects and
// pass them to the strict library types without ceremony.
export const versionedCredentials = new Map<number, () => any>([
  [
    1.0,
    () => ({
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        EXAMPLES_V1_CONTEXT_URL
      ],
      id: 'http://example.edu/credentials/1872',
      type: ['VerifiableCredential', 'AlumniCredential'],
      issuer: 'https://example.edu/issuers/565049',
      issuanceDate: '2010-01-01T19:23:24Z',
      credentialSubject: {
        id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
        alumniOf: '<span lang="en">Example University</span>'
      }
    })
  ],
  [
    2.0,
    () => ({
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        EXAMPLES_V2_CONTEXT_URL
      ],
      id: 'http://example.edu/credentials/1872',
      type: ['VerifiableCredential', 'AlumniCredential'],
      issuer: 'https://example.edu/issuers/565049',
      credentialSubject: {
        id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
        alumniOf: '<span lang="en">Example University</span>'
      }
    })
  ]
])
