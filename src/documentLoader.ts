/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import type { RemoteDocument } from '@interop/jsonld-signatures'
// load locally embedded contexts
import { contexts } from './contexts/index.js'

export async function documentLoader(url: string): Promise<RemoteDocument> {
  const context = contexts.get(url)
  if (context !== undefined) {
    return {
      contextUrl: null,
      documentUrl: url,
      document: context
    }
  }
  throw new Error(`Document loader unable to load URL "${url}".`)
}
