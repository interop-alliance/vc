/**
 * Browser entry module for the issue -> verify roundtrip Playwright smoke test.
 *
 * The bare-specifier imports (`@interop/...`) are rewritten by the Vite dev
 * server when it serves and transforms this module, which is why the Playwright
 * test imports this single served URL rather than importing the packages
 * directly inside `page.evaluate` (where no Vite transform runs).
 *
 * Mirrors the "should verify a vc" Node test: generate a `did:key` Ed25519
 * issuer, issue a VC with the `Ed25519Signature2020` suite, then verify it --
 * confirming the library and its dependency chain work in a real browser bundle.
 */
import { Ed25519Signature2020 } from '@interop/ed25519-signature'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { driver as didKeyDriver } from '@interop/did-method-key'
import * as vc from '../../src/index.js'
import { documentLoader } from '../node/documentLoader.js'
import { versionedCredentials } from '../node/mock-data.js'

export async function runRoundtrip(): Promise<{
  hasProof: boolean
  verified: boolean
}> {
  const didKey = didKeyDriver()
  didKey.use({ keyPairClass: Ed25519VerificationKey })

  const { didDocument, methodFor } = await didKey.generate()
  const assertionKey = methodFor({ purpose: 'assertionMethod' })
  const suite: any = new Ed25519Signature2020({
    signer: (assertionKey as any).signer()
  })

  const credential = versionedCredentials.get(2.0)!()
  credential.issuer = didDocument.id

  const verifiableCredential = await vc.issue({
    credential,
    suite,
    documentLoader
  })
  const result = await vc.verifyCredential({
    credential: verifiableCredential,
    suite,
    documentLoader
  })
  if (result.error) {
    throw result.error
  }
  return {
    hasProof: verifiableCredential.proof != null,
    verified: result.verified
  }
}
