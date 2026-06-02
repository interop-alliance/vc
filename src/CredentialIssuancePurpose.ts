/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import jsigs from '@interop/jsonld-signatures'
import type {
  LinkedDataProof,
  ProofValidateResult
} from '@interop/jsonld-signatures'
import type { IVerificationMethod } from '@interop/data-integrity-core/did'
import type { IDocumentLoader } from '@interop/data-integrity-core/loader'
import type { IProofDescription } from '@interop/data-integrity-core/vcdm'
import jsonld from '@interop/jsonld'

const {
  purposes: { AssertionProofPurpose }
} = jsigs

/**
 * Creates a proof purpose that will validate whether the verification
 * method in a proof was authorized by its declared controller for the
 * proof's purpose.
 */
export class CredentialIssuancePurpose extends AssertionProofPurpose {
  /**
   * @param options - The options to use.
   * @param options.controller - The description of the controller, if it is
   *   not to be dereferenced via a `documentLoader`.
   * @param options.date - The expected date for the creation of the proof.
   * @param options.maxTimestampDelta - A maximum number of seconds that the
   *   date on the signature can deviate from.
   */
  constructor({
    controller,
    date,
    maxTimestampDelta
  }: {
    controller?: object
    date?: string | Date | number
    maxTimestampDelta?: number
  } = {}) {
    super({ controller, date, maxTimestampDelta })
  }

  /**
   * Validates the purpose of a proof. This method is called during
   * proof verification, after the proof value has been checked against the
   * given verification method (in the case of a digital signature, the
   * signature has been cryptographically verified against the public key).
   *
   * @param proof - The proof to validate.
   * @param options - The options to use.
   * @param options.document - The document whose signature is being verified.
   * @param options.suite - Signature suite used in the proof.
   * @param options.verificationMethod - Key id URL to the paired public key.
   * @param options.documentLoader - A document loader.
   *
   * @throws {Error} If verification method not authorized by controller.
   * @throws {Error} If proof's created timestamp is out of range.
   */
  async validate(
    proof: IProofDescription,
    {
      document,
      suite,
      verificationMethod,
      documentLoader
    }: {
      document?: object
      suite?: LinkedDataProof
      verificationMethod?: IVerificationMethod
      documentLoader?: IDocumentLoader
    }
  ): Promise<ProofValidateResult> {
    try {
      const result = await super.validate(proof, {
        document,
        suite,
        verificationMethod,
        documentLoader
      })

      if (!result.valid) {
        throw result.error
      }

      const issuer = jsonld.getValues(document, 'issuer')

      if (!issuer || issuer.length === 0) {
        throw new Error('Credential issuer is required.')
      }

      const issuerId = typeof issuer[0] === 'string' ? issuer[0] : issuer[0].id

      const controller = result.controller as { id?: string } | undefined
      if (controller?.id !== issuerId) {
        throw new Error(
          'Credential issuer must match the verification method controller.'
        )
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: error as Error }
    }
  }
}
