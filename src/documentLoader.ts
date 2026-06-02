/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import type { IRemoteDocument } from '@interop/data-integrity-core/loader'
// load locally embedded contexts
import { contexts } from './contexts/index.js'

export async function documentLoader(url: string): Promise<IRemoteDocument> {
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
