/**
 * A TypeScript implementation of Verifiable Credentials.
 *
 * @author Dave Longley
 * @author David I. Lehn
 *
 * @license BSD 3-Clause License
 * Copyright (c) 2017-2023 Digital Bazaar, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of the Digital Bazaar, Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import jsigs from '@interop/jsonld-signatures'
import type {
  AuthenticationProofPurposeOptions,
  DocumentLoader,
  LinkedDataProof,
  LinkedDataSignature,
  ProofPurpose
} from '@interop/jsonld-signatures'
import jsonld from '@interop/jsonld'
import type {
  ICredentialSubject,
  IVerifiableCredential,
  IVerifiablePresentation
} from '@interop/data-integrity-core'
import {
  assertCredentialContext,
  assertDateString,
  checkContextVersion,
  compareTime,
  CREDENTIALS_CONTEXT_V1_URL,
  CREDENTIALS_CONTEXT_V2_URL
} from './helpers.js'
import { documentLoader as _documentLoader } from './documentLoader.js'
import { CredentialIssuancePurpose } from './CredentialIssuancePurpose.js'

const { AssertionProofPurpose, AuthenticationProofPurpose } = jsigs.purposes

export { dateRegex } from './helpers.js'
export const defaultDocumentLoader: DocumentLoader =
  jsigs.extendContextLoader(_documentLoader)
export { CredentialIssuancePurpose }

/** A verifiable credential. */
export type VerifiableCredential = IVerifiableCredential

/** A verifiable presentation. */
export type VerifiablePresentation = IVerifiablePresentation

/** A verifiable presentation (signed or unsigned). */
export type Presentation = IVerifiablePresentation

/** An error augmented with a fine-grained verification result `log`. */
type ErrorWithLog = Error & { log?: LogEntry[] }

/** A single entry in a fine-grained verification result `log`. */
export interface LogEntry {
  /** Check identifier (for example `valid_signature`). */
  id: string
  /** Whether the check passed. */
  valid: boolean
}

/** The result of verifying a single credential. */
export interface VerifyCredentialResult {
  /** True if verified, false if not. */
  verified: boolean
  /** Credential status check result. */
  statusResult?: any
  /** Per-proof verification results. */
  results?: any[]
  /** Fine-grained check log. */
  log?: LogEntry[]
  /** The source credential, present when `includeCredentials` is `true`. */
  credential?: VerifiableCredential
  /** The verified credential's id. */
  credentialId?: string
  /** Set if verification failed. */
  error?: Error
}

/** The result of verifying a presentation. */
export interface VerifyPresentationResult {
  /** True if verified, false if not. */
  verified: boolean
  /** Presentation proof result. */
  presentationResult?: any
  /** Per-credential verification results. */
  credentialResults?: VerifyCredentialResult[]
  /** Present on the error and unsigned-presentation return paths. */
  results?: any[]
  /** Set if verification failed. */
  error?: Error
}

/** A function for checking credential status. */
export type CheckStatus = (options: any) => Promise<any>

/** Options for {@link issue}. */
export interface IssueCredentialOptions {
  credential?: VerifiableCredential
  suite?: LinkedDataSignature
  purpose?: ProofPurpose
  documentLoader?: DocumentLoader
  now?: string | Date
  maxClockSkew?: number
}

/** Options for {@link derive}. */
export interface DeriveOptions {
  verifiableCredential?: VerifiableCredential
  suite?: LinkedDataProof
  documentLoader?: DocumentLoader
}

/** Options for {@link verifyCredential}. */
export interface VerifyCredentialOptions {
  credential?: VerifiableCredential
  suite?: LinkedDataProof | LinkedDataProof[]
  purpose?: ProofPurpose
  controller?: object
  documentLoader?: DocumentLoader
  checkStatus?: CheckStatus
  now?: string | Date
  maxClockSkew?: number
}

/** Options for {@link verify}. */
export interface VerifyPresentationOptions {
  presentation?: VerifiablePresentation
  suite?: LinkedDataProof | LinkedDataProof[]
  unsignedPresentation?: boolean
  presentationPurpose?: ProofPurpose
  challenge?: string
  controller?: object
  domain?: string
  documentLoader?: DocumentLoader
  checkStatus?: CheckStatus
  now?: string | Date
  maxClockSkew?: number
  includeCredentials?: boolean
}

/** Options for {@link createPresentation}. */
export interface CreatePresentationOptions {
  verifiableCredential?: VerifiableCredential | VerifiableCredential[]
  id?: string
  holder?: string
  now?: string | Date
  version?: number
  verify?: boolean
  maxClockSkew?: number
}

/** Options for {@link signPresentation}. */
export interface SignPresentationOptions {
  presentation?: Presentation
  suite?: LinkedDataSignature
  purpose?: ProofPurpose
  domain?: string
  challenge?: string
  documentLoader?: DocumentLoader
}

/** Options for {@link _checkCredential}. */
export interface CheckCredentialOptions {
  credential: VerifiableCredential
  log?: LogEntry[]
  now?: string | Date
  mode?: string
  maxClockSkew?: number
}

/**
 * Issues a verifiable credential (by taking a base credential document,
 * and adding a digital signature to it).
 *
 * @param options - The options to use.
 * @param options.credential - Base credential document.
 * @param options.suite - Signature suite (with private key material or an API
 *   to use it), passed in to `sign()`.
 * @param options.purpose - A ProofPurpose. If not specified, a default purpose
 *   will be created.
 * @param options.documentLoader - A document loader.
 * @param options.now - A string representing date time in ISO 8601 format or an
 *   instance of Date. Defaults to current date time.
 * @param options.maxClockSkew - A maximum number of seconds that clocks may be
 *   skewed when checking date-times against `now`.
 *
 * @throws {Error} If missing required properties.
 *
 * @returns Resolves on completion.
 */
export async function issue({
  credential,
  suite,
  purpose = new CredentialIssuancePurpose(),
  documentLoader = defaultDocumentLoader,
  now,
  maxClockSkew = 300
}: IssueCredentialOptions = {}): Promise<VerifiableCredential> {
  // check to make sure the `suite` has required params
  // Note: verificationMethod defaults to publicKey.id, in suite constructor
  if (!suite) {
    throw new TypeError('"suite" parameter is required for issuing.')
  }
  if (!suite.verificationMethod) {
    throw new TypeError('"suite.verificationMethod" property is required.')
  }

  if (!credential) {
    throw new TypeError('"credential" parameter is required for issuing.')
  }
  if (
    checkContextVersion({ credential, version: 1.0 }) &&
    !credential.issuanceDate
  ) {
    const now = new Date().toJSON()
    credential.issuanceDate = `${now.slice(0, now.length - 5)}Z`
  }

  // run common credential checks
  _checkCredential({ credential, now, mode: 'issue', maxClockSkew })

  return (await jsigs.sign(credential, {
    purpose,
    documentLoader,
    suite
  })) as VerifiableCredential
}

/**
 * Derives a proof from the given verifiable credential, resulting in a new
 * verifiable credential. This method is usually used to generate selective
 * disclosure and / or unlinkable proofs.
 *
 * @param options - The options to use.
 * @param options.verifiableCredential - The verifiable credential containing a
 *   base proof to derive another proof from.
 * @param options.suite - Derived proof signature suite.
 * @param options.documentLoader - A document loader.
 *
 * @throws {Error} If missing required properties.
 *
 * @returns Resolves on completion.
 */
export async function derive({
  verifiableCredential,
  suite,
  documentLoader = defaultDocumentLoader
}: DeriveOptions = {}): Promise<VerifiableCredential> {
  if (!verifiableCredential) {
    throw new TypeError('"credential" parameter is required for deriving.')
  }
  if (!suite) {
    throw new TypeError('"suite" parameter is required for deriving.')
  }

  // run common credential checks
  _checkCredential({ credential: verifiableCredential, mode: 'issue' })

  return (await jsigs.derive(verifiableCredential, {
    purpose: new AssertionProofPurpose(),
    documentLoader,
    suite
  })) as VerifiableCredential
}

/**
 * Verifies a verifiable presentation:
 *   - Checks that the presentation is well-formed
 *   - Checks the proofs (for example, checks digital signatures against the
 *     provided public keys).
 *
 * @param options - The options to use.
 * @param options.presentation - Verifiable presentation, signed or unsigned,
 *   that may contain within it a verifiable credential.
 * @param options.suite - One or more signature suites that are supported by the
 *   caller's use case. This is an explicit design decision -- the calling code
 *   must specify which signature types (ed25519, RSA, etc) are allowed.
 *   Although it is expected that the secure resolution/fetching of the public
 *   key material (to verify against) is to be handled by the documentLoader,
 *   the suite param can optionally include the key directly.
 * @param options.unsignedPresentation - By default, this function assumes that
 *   a presentation is signed (and will return an error if a `proof` section is
 *   missing). Set this to `true` if you're using an unsigned presentation.
 * @param options.presentationPurpose - Optional proof purpose (a default one
 *   will be created if not passed in).
 * @param options.challenge - Required if purpose is not passed in.
 * @param options.controller - A controller.
 * @param options.domain - A domain.
 * @param options.documentLoader - A document loader.
 * @param options.checkStatus - Optional function for checking credential status
 *   if `credentialStatus` is present on the credential.
 * @param options.now - A string representing date time in ISO 8601 format or an
 *   instance of Date. Defaults to current date time.
 * @param options.maxClockSkew - A maximum number of seconds that clocks may be
 *   skewed when checking date-times against `now`.
 * @param options.includeCredentials - Set to `true` to include each verified
 *   `credential` in its entry in `credentialResults`. Defaults to `true` to
 *   preserve backwards compatibility; set to `false` to omit them.
 *
 * @returns The verification result.
 */
export async function verify(
  options: VerifyPresentationOptions = {}
): Promise<VerifyPresentationResult> {
  const { presentation } = options
  try {
    if (!presentation) {
      throw new TypeError(
        'A "presentation" property is required for verifying.'
      )
    }
    return await _verifyPresentation(options)
  } catch (error) {
    return {
      verified: false,
      results: [{ presentation, verified: false, error }],
      error: error as Error
    }
  }
}

/**
 * Verifies a verifiable credential:
 *   - Checks that the credential is well-formed
 *   - Checks the proofs (for example, checks digital signatures against the
 *     provided public keys).
 *
 * @param options - The options.
 * @param options.credential - Verifiable credential.
 * @param options.suite - One or more signature suites that are supported by the
 *   caller's use case. This is an explicit design decision -- the calling code
 *   must specify which signature types (ed25519, RSA, etc) are allowed.
 *   Although it is expected that the secure resolution/fetching of the public
 *   key material (to verify against) is to be handled by the documentLoader,
 *   the suite param can optionally include the key directly.
 * @param options.purpose - Optional proof purpose (a default one will be
 *   created if not passed in).
 * @param options.documentLoader - A document loader.
 * @param options.checkStatus - Optional function for checking credential status
 *   if `credentialStatus` is present on the credential.
 * @param options.now - A string representing date time in ISO 8601 format or an
 *   instance of Date. Defaults to current date time.
 * @param options.maxClockSkew - A maximum number of seconds that clocks may be
 *   skewed when checking date-times against `now`.
 *
 * @returns The verification result.
 */
export async function verifyCredential(
  options: VerifyCredentialOptions = {}
): Promise<VerifyCredentialResult> {
  const { credential } = options
  try {
    if (!credential) {
      throw new TypeError('A "credential" property is required for verifying.')
    }
    return await _verifyCredential(options)
  } catch (error) {
    return {
      verified: false,
      results: [{ credential, verified: false, error }],
      error: error as Error
    }
  }
}

/**
 * Verifies a verifiable credential.
 *
 * @param options - The options.
 *
 * @throws {Error} If required parameters are missing (in `_checkCredential`).
 *
 * @returns The verification result.
 */
async function _verifyCredential(
  options: VerifyCredentialOptions = {}
): Promise<VerifyCredentialResult> {
  const credential = options.credential as VerifiableCredential
  const { checkStatus, now, maxClockSkew = 300 } = options

  // Fine-grained result log containing checks performed. Example:
  // [
  //   {id: 'valid_signature', valid: true},
  //   {id: 'issuer_did_resolves', valid: true},
  //   {id: 'expiration', valid: true},
  //   {id: 'revocation_status', valid: true},
  //   {id: 'suspension_status', valid: true}
  // ]
  const log: LogEntry[] = []

  const documentLoader = options.documentLoader || defaultDocumentLoader

  const { controller } = options
  const purpose =
    options.purpose || new CredentialIssuancePurpose({ controller })

  let result: VerifyCredentialResult
  try {
    result = await jsigs.verify(credential, {
      purpose,
      documentLoader,
      ...options
    } as any)
  } catch (error) {
    log.push({ id: 'valid_signature', valid: false })
    ;(error as ErrorWithLog).log = log
    throw error
  }

  // if verification has failed, skip status check
  if (!result.verified) {
    return result
  }

  log.push({ id: 'valid_signature', valid: true })
  log.push({ id: 'issuer_did_resolves', valid: true })

  // if credential status is provided, a `checkStatus` function must be given
  if (credential.credentialStatus && typeof checkStatus !== 'function') {
    throw new TypeError(
      'A "checkStatus" function must be given to verify credentials with ' +
        '"credentialStatus".'
    )
  }

  if (credential.credentialStatus) {
    await addStatusInfoToLog({ options, result, log })
  }

  // run common credential checks (add check results to log)
  _checkCredential({ credential, log, now, maxClockSkew })

  result.log = log
  if (result.results) {
    result.results[0].log = log
  }
  return result
}

async function addStatusInfoToLog({
  options,
  result,
  log
}: {
  options: VerifyCredentialOptions
  result: VerifyCredentialResult
  log: LogEntry[]
}): Promise<void> {
  const { checkStatus } = options
  result.statusResult = await checkStatus!(options)
  if (!result.statusResult.verified) {
    result.verified = false
  }
  const statusResults = result.statusResult?.results ?? []
  for (const entry of statusResults) {
    log.push({
      id: `${entry.credentialStatus.statusPurpose}_status`,
      valid: entry.verified
    })
  }
}

/**
 * Creates an unsigned presentation from a given verifiable credential.
 *
 * @param options - Options to use.
 * @param options.verifiableCredential - One or more verifiable credential.
 * @param options.id - Optional VP id.
 * @param options.holder - Optional presentation holder url.
 * @param options.now - A string representing date time in ISO 8601 format or an
 *   instance of Date. Defaults to current date time.
 * @param options.version - The VC context version to use.
 * @param options.verify - If set to true, throw verification errors for
 *   individual VCs (such as when the VC is expired, etc).
 * @param options.maxClockSkew - A maximum number of seconds that clocks may be
 *   skewed when checking date-times against `now`.
 *
 * @throws {TypeError} If verifiableCredential param is missing.
 * @throws {Error} If the credential (or the presentation params) are missing
 *   required properties.
 *
 * @returns The credential wrapped inside of a VerifiablePresentation.
 */
export function createPresentation({
  verifiableCredential,
  id,
  holder,
  now,
  version = 2.0,
  verify = true,
  maxClockSkew = 300
}: CreatePresentationOptions = {}): Presentation {
  const initialContext =
    version === 2.0 ? CREDENTIALS_CONTEXT_V2_URL : CREDENTIALS_CONTEXT_V1_URL
  const presentation: Presentation = {
    '@context': [initialContext],
    type: ['VerifiablePresentation']
  }
  if (verifiableCredential) {
    const credentials = Array.isArray(verifiableCredential)
      ? verifiableCredential
      : [verifiableCredential]

    if (verify) {
      // ensure all credentials are valid and verified
      for (const credential of credentials) {
        _checkCredential({
          credential,
          now,
          maxClockSkew,
          mode: verify ? 'verify' : 'do not force verify'
        })
      }
    }

    presentation.verifiableCredential = credentials
  }
  if (id) {
    presentation.id = id
  }
  if (holder) {
    presentation.holder = holder
  }

  _checkPresentation(presentation)

  return presentation
}

/**
 * Signs a given presentation.
 *
 * @param options - Options to use.
 * @param options.presentation - A presentation.
 * @param options.suite - Passed in to `sign()`.
 * @param options.purpose - A ProofPurpose. If not specified, a default purpose
 *   will be created with the domain and challenge options.
 * @param options.domain - A domain.
 * @param options.challenge - A required challenge.
 * @param options.documentLoader - A document loader.
 *
 * @returns A VerifiablePresentation with a proof.
 */
export async function signPresentation(
  options: SignPresentationOptions = {}
): Promise<VerifiablePresentation> {
  const { presentation, domain, challenge } = options
  const purpose =
    options.purpose ||
    new AuthenticationProofPurpose({
      domain,
      challenge: challenge as string
    } as AuthenticationProofPurposeOptions)

  const documentLoader = options.documentLoader || defaultDocumentLoader

  return (await jsigs.sign(
    presentation as object,
    {
      ...options,
      purpose,
      documentLoader
    } as any
  )) as VerifiablePresentation
}

/**
 * Verifies that the VerifiablePresentation is well formed, and checks the
 * proof signature if it's present. Also verifies all the VerifiableCredentials
 * that are present in the presentation, if any.
 *
 * @param options - The options.
 *
 * @throws {Error} If presentation is missing required params.
 *
 * @returns The verification result.
 */
async function _verifyPresentation(
  options: VerifyPresentationOptions = {}
): Promise<VerifyPresentationResult> {
  const {
    presentation,
    unsignedPresentation,
    includeCredentials = true
  } = options

  _checkPresentation(presentation as Presentation)

  const documentLoader = options.documentLoader || defaultDocumentLoader

  // FIXME: verify presentation first, then each individual credential
  // only if that proof is verified

  // if verifiableCredentials are present, verify them, individually
  let credentialResults: VerifyCredentialResult[] | undefined
  let verified = true
  const credentials = jsonld.getValues(presentation, 'verifiableCredential')
  if (credentials.length > 0) {
    // verify every credential in `verifiableCredential`
    credentialResults = await Promise.all(
      credentials.map((credential: VerifiableCredential) => {
        return verifyCredential({ ...options, credential, documentLoader })
      })
    )

    for (const [i, credentialResult] of credentialResults.entries()) {
      credentialResult.credentialId = credentials[i].id
      if (includeCredentials) {
        credentialResult.credential = credentials[i]
      }
    }

    const allCredentialsVerified = credentialResults.every(
      result => result.verified
    )
    if (!allCredentialsVerified) {
      verified = false
    }
  }

  if (unsignedPresentation) {
    // No need to verify the proof section of this presentation
    return { verified, results: [presentation], credentialResults }
  }

  const { controller, domain, challenge } = options
  if (!options.presentationPurpose && !challenge) {
    throw new Error(
      'A "challenge" param is required for AuthenticationProofPurpose.'
    )
  }

  const purpose =
    options.presentationPurpose ||
    new AuthenticationProofPurpose({
      controller,
      domain,
      challenge: challenge as string
    } as AuthenticationProofPurposeOptions)

  const presentationResult = await jsigs.verify(
    presentation as object,
    {
      ...options,
      purpose,
      documentLoader
    } as any
  )

  return {
    presentationResult,
    verified: verified && presentationResult.verified,
    credentialResults,
    error: presentationResult.error
  }
}

/**
 * @param obj - Either an object with an id property or a string that is an id.
 * @returns Either an id or undefined.
 */
function _getId(obj: any): string | undefined {
  if (typeof obj === 'string') {
    return obj
  }

  if (!('id' in obj)) {
    return
  }

  return obj.id
}

// export for testing
/**
 * @param presentation - An object that could be a presentation.
 *
 * @throws {Error}
 */
export function _checkPresentation(presentation: Presentation): void {
  // normalize to an array to allow the common case of context being a string
  const context = Array.isArray(presentation['@context'])
    ? presentation['@context']
    : [presentation['@context']]
  assertCredentialContext({ context })

  const types = jsonld.getValues(presentation, 'type')

  // check type presence
  if (!types.includes('VerifiablePresentation')) {
    throw new Error('"type" must include "VerifiablePresentation".')
  }
}

// these props of a VC must be an object with a type
// if present in a VC or VP
const mustHaveType = ['proof', 'credentialStatus', 'termsOfUse', 'evidence']

// export for testing
/**
 * @param options - The options.
 * @param options.credential - An object that could be a VerifiableCredential.
 * @param options.log - Optional events log, for fine-grained verification
 *   result reporting.
 * @param options.now - A string representing date time in ISO 8601 format or an
 *   instance of Date. Defaults to current date time.
 * @param options.mode - The mode of operation for this validation function,
 *   either `issue` or `verify`.
 * @param options.maxClockSkew - A maximum number of seconds that clocks may be
 *   skewed when checking date-times against `now`.
 *
 * @throws {Error}
 */
export function _checkCredential({
  credential,
  log = [],
  now = new Date(),
  mode = 'verify',
  maxClockSkew = 300
}: CheckCredentialOptions): void {
  const nowDate: Date = typeof now === 'string' ? new Date(now) : now
  assertCredentialContext({ context: credential['@context'] })

  // check type presence and cardinality
  if (!credential.type) {
    throw new Error('"type" property is required.')
  }

  if (!jsonld.getValues(credential, 'type').includes('VerifiableCredential')) {
    throw new Error('"type" must include `VerifiableCredential`.')
  }

  _checkCredentialSubjects({ credential })

  if (!credential.issuer) {
    throw new Error('"issuer" property is required.')
  }
  if (checkContextVersion({ credential, version: 1.0 })) {
    // check issuanceDate exists
    if (!credential.issuanceDate) {
      throw new Error('"issuanceDate" property is required.')
    }
    // check issuanceDate format on issue
    assertDateString({ credential, prop: 'issuanceDate' })

    // check issuanceDate cardinality
    if (jsonld.getValues(credential, 'issuanceDate').length > 1) {
      throw new Error('"issuanceDate" property can only have one value.')
    }
    // optionally check expirationDate
    if ('expirationDate' in credential) {
      // check if `expirationDate` property is a date
      try {
        assertDateString({ credential, prop: 'expirationDate' })
      } catch (error) {
        log.push({ id: 'expiration', valid: false })
        ;(error as ErrorWithLog).log = log
        throw error
      }
      if (mode === 'verify') {
        // check if `now` is after `expirationDate`
        const expirationDate = new Date(credential.expirationDate as string)
        if (
          compareTime({ t1: nowDate, t2: expirationDate, maxClockSkew }) > 0
        ) {
          log.push({ id: 'expiration', valid: false })
          const error = new Error('Credential has expired.') as ErrorWithLog
          error.log = log
          throw error
        }
      }
    }
    log.push({ id: 'expiration', valid: true })
    // check if `now` is before `issuanceDate` on verification
    if (mode === 'verify') {
      const issuanceDate = new Date(credential.issuanceDate as string)
      if (compareTime({ t1: issuanceDate, t2: nowDate, maxClockSkew }) > 0) {
        throw new Error(
          `The current date time (${nowDate.toISOString()}) is before the ` +
            `"issuanceDate" (${credential.issuanceDate}).`
        )
      }
    }
  }
  if (checkContextVersion({ credential, version: 2.0 })) {
    // check if 'validUntil' and 'validFrom'
    const { validUntil, validFrom } = credential
    if (validUntil) {
      try {
        assertDateString({ credential, prop: 'validUntil' })
      } catch (error) {
        log.push({ id: 'expiration', valid: false })
        ;(error as ErrorWithLog).log = log
        throw error
      }
      if (mode === 'verify') {
        const validUntilDate = new Date(credential.validUntil as string)
        if (
          compareTime({ t1: nowDate, t2: validUntilDate, maxClockSkew }) > 0
        ) {
          log.push({ id: 'expiration', valid: false })
          const error = new Error(
            `The current date time (${nowDate.toISOString()}) is after ` +
              `"validUntil" (${credential.validUntil}).`
          ) as ErrorWithLog
          error.log = log
          throw error
        }
      }
    }
    log.push({ id: 'expiration', valid: true })
    if (validFrom) {
      assertDateString({ credential, prop: 'validFrom' })
      if (mode === 'verify') {
        // check if `now` is before `validFrom`
        const validFromDate = new Date(credential.validFrom as string)
        if (compareTime({ t1: validFromDate, t2: nowDate, maxClockSkew }) > 0) {
          throw new Error(
            `The current date time (${nowDate.toISOString()}) is before ` +
              `"validFrom" (${credential.validFrom}).`
          )
        }
      }
    }
  }
  // check issuer cardinality
  if (jsonld.getValues(credential, 'issuer').length > 1) {
    throw new Error('"issuer" property can only have one value.')
  }

  // check issuer is a URL
  if ('issuer' in credential) {
    const issuer = _getId(credential.issuer)
    if (!issuer) {
      throw new Error(`"issuer" id is required.`)
    }
    _validateUriId({ id: issuer, propertyName: 'issuer' })
  }

  // check credentialStatus
  jsonld.getValues(credential, 'credentialStatus').forEach((cs: any) => {
    // check if optional "id" is a URL
    if ('id' in cs) {
      _validateUriId({ id: cs.id, propertyName: 'credentialStatus.id' })
    }

    // check "type" present
    if (!cs.type) {
      throw new Error('"credentialStatus" must include a type.')
    }
  })

  // check evidences are URLs
  jsonld.getValues(credential, 'evidence').forEach((evidence: any) => {
    const evidenceId = _getId(evidence)
    if (evidenceId) {
      _validateUriId({ id: evidenceId, propertyName: 'evidence' })
    }
  })

  // check if properties that require a type are
  // defined, objects, and objects with types
  for (const prop of mustHaveType) {
    if (prop in credential) {
      const value = credential[prop]
      if (Array.isArray(value)) {
        value.forEach(entry => _checkTypedObject(entry, prop))
        continue
      }
      _checkTypedObject(value, prop)
    }
  }
}

/**
 * Checks that a property is a non-empty object with property type.
 *
 * @param obj - A potential object.
 * @param name - The name of the property.
 *
 * @throws {Error} If the property is not an object with a type.
 */
function _checkTypedObject(obj: unknown, name: string): void {
  if (!isObject(obj)) {
    throw new Error(`property "${name}" must be an object.`)
  }
  if (_emptyObject(obj)) {
    throw new Error(`property "${name}" can not be an empty object.`)
  }
  if (!('type' in obj)) {
    throw new Error(`property "${name}" must have property type.`)
  }
}

/**
 * Takes in a credential and checks the credentialSubject(s).
 *
 * @param options - Options.
 * @param options.credential - The credential to check.
 *
 * @throws {Error} Throws on errors in the credential subject.
 */
function _checkCredentialSubjects({
  credential
}: {
  credential: VerifiableCredential
}): void {
  if (!credential?.credentialSubject) {
    throw new Error('"credentialSubject" property is required.')
  }
  if (Array.isArray(credential.credentialSubject)) {
    for (const subject of credential.credentialSubject) {
      _checkCredentialSubject({ subject })
    }
    return
  }
  _checkCredentialSubject({ subject: credential.credentialSubject })
}

/**
 * Checks a credential subject is valid.
 *
 * @param options - Options.
 * @param options.subject - A potential credential subject.
 *
 * @throws {Error} If the credentialSubject is not valid.
 */
function _checkCredentialSubject({
  subject
}: {
  subject: ICredentialSubject
}): void {
  if (isObject(subject) === false) {
    throw new Error('"credentialSubject" must be a non-null object.')
  }
  if (_emptyObject(subject)) {
    throw new Error('"credentialSubject" must make a claim.')
  }
  // If credentialSubject.id is present and is not a URI, reject it
  if (subject.id) {
    _validateUriId({ id: subject.id, propertyName: 'credentialSubject.id' })
  }
}

/**
 * Checks if parameter is an object.
 *
 * @param obj - A potential object.
 *
 * @returns False if not an object or null.
 */
function isObject(obj: unknown): obj is Record<string, unknown> {
  // return false for null even though it has type object
  if (obj === null) {
    return false
  }
  // if something has type object and is not null return true
  if (typeof obj === 'object') {
    return true
  }
  // return false for strings, symbols, etc.
  return false
}

/**
 * Is it an empty object?
 *
 * @param obj - A potential object.
 *
 * @returns Is it empty?
 */
function _emptyObject(obj: unknown): boolean {
  // if the parameter is not an object return true
  // as a non-object is an empty object
  if (!isObject(obj)) {
    return true
  }
  return Object.keys(obj).length === 0
}

/**
 * Validates if an ID is a URL.
 *
 * @param options - Options.
 * @param options.id - The id.
 * @param options.propertyName - The property name.
 *
 * @throws {Error} Throws if an id is not a URL.
 */
function _validateUriId({
  id,
  propertyName
}: {
  id: string
  propertyName: string
}): void {
  let parsed
  try {
    parsed = new URL(id)
  } catch (cause) {
    const error = new TypeError(`"${propertyName}" must be a URI: "${id}".`)
    error.cause = cause
    throw error
  }

  if (!parsed.protocol) {
    throw new TypeError(`"${propertyName}" must be a URI: "${id}".`)
  }
}
