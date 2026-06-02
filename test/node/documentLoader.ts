/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Test document loader. Built on `@interop/security-document-loader`, which
 * bundles the credentials v1/v2, DID, Ed25519 2020, and Multikey contexts and
 * resolves `did:key` DIDs automatically. We layer on the example contexts, the
 * malformed contexts used by the negative tests, and a mutable `remoteDocuments`
 * registry so individual tests can register ad-hoc controller/key documents
 * (e.g. for the ECDSA-SD suite, which is not a `did:key`).
 */
import { securityLoader } from '@interop/security-document-loader'
import {
  EXAMPLES_V1_CONTEXT_URL,
  EXAMPLES_V2_CONTEXT_URL,
  examplesV1Context,
  examplesV2Context
} from './mock-data.js'
import { invalidContexts } from './contexts.js'

const loader = securityLoader()

loader.addStatic(EXAMPLES_V1_CONTEXT_URL, examplesV1Context)
loader.addStatic(EXAMPLES_V2_CONTEXT_URL, examplesV2Context)

// Register the malformed contexts (skip the `null` doc, which is meant to be
// unresolvable -- it falls through to a "not found" throw, failing verification
// the same way upstream did).
for (const { url, value } of Object.values(invalidContexts)) {
  if (value != null) {
    loader.addStatic(url, value)
  }
}

const builtLoader = loader.build()

export interface LoadedDocument {
  contextUrl?: string | null
  document: unknown
  documentUrl?: string
}

// Documents registered here take precedence over the static/DID loader.
export const remoteDocuments = new Map<string, unknown>()

export async function documentLoader(url: string): Promise<LoadedDocument> {
  const registered = remoteDocuments.get(url)
  if (registered != null) {
    return {
      contextUrl: null,
      document: structuredClone(registered),
      documentUrl: url
    }
  }
  return builtLoader(url)
}
