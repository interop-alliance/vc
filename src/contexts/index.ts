/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import { contexts as credentialsContexts } from 'credentials-context'
import { contexts as credentialsV2Contexts } from '@digitalcredentials/credentials-v2-context'

export const contexts = new Map<string, unknown>()

// adds the _contexts to the contexts map
function addContexts(_contexts: Map<string, unknown>): void {
  for (const [url, context] of _contexts.entries()) {
    contexts.set(url, context)
  }
}

addContexts(credentialsContexts)
addContexts(credentialsV2Contexts)
