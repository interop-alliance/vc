/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import * as EcdsaMultikey from '@digitalbazaar/ecdsa-multikey'
import * as ecdsaSd2023Cryptosuite from '@digitalbazaar/ecdsa-sd-2023-cryptosuite'
import { v4 as uuid } from 'uuid'
import { Ed25519Signature2020, eddsaRdfc2022 } from '@interop/ed25519-signature'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { driver as didKeyDriver } from '@interop/did-method-key'
import { DataIntegrityProof } from '@interop/data-integrity-proof'
import type { LinkedDataProof } from '@interop/jsonld-signatures'
import * as vc from '../../src/index.js'
import { documentLoader, remoteDocuments } from './documentLoader.js'
import { createSkewedTimeStamp } from './helpers.js'
import { invalidContexts } from './contexts.js'
import { versionedCredentials } from './mock-data.js'

const {
  createDiscloseCryptosuite,
  createSignCryptosuite,
  createVerifyCryptosuite
} = ecdsaSd2023Cryptosuite

const didKey = didKeyDriver()
didKey.use({ keyPairClass: Ed25519VerificationKey })

// The suite holders below are the concrete suite classes. They all extend
// jsonld-signatures' `LinkedDataProof`, which is the `suite` param type across
// `vc.issue`/`verifyCredential`/`derive`/`signPresentation`/`verify`. The key
// holders (`assertionKey`, `ecdsaKeyPair`) stay `any` because the verification-
// key and ecdsa-multikey packages they come from are untyped here.
//
// Shared Ed25519 2020 issuer suite, used for signing and verifying VCs. The
// VC 2.0 context only defines proof terms such as `challenge` under the
// `DataIntegrityProof` type scope, so presentations (which carry a `challenge`)
// are signed with the modern eddsa-rdfc-2022 Multikey suite instead -- both
// suites the maintainer wants exercised.
let suite: Ed25519Signature2020
// eddsa-rdfc-2022 DataIntegrityProof suite over the same key, for VP signing.
let vpSuite: DataIntegrityProof
// did:key DID whose verification method controls the shared suites.
let issuerDid: string
let assertionKey: any

// Shared ECDSA key pair, used by the ecdsa-sd-2023 selective-disclosure tests.
let ecdsaKeyPair: any
const ecdsaController = 'https://example.edu/issuers/565049'
const ecdsaKeyId = `${ecdsaController}#keys-2`

beforeAll(async () => {
  // set up the Ed25519 issuer as a did:key DID
  const { didDocument, methodFor } = await didKey.generate()
  issuerDid = didDocument.id
  assertionKey = methodFor({ purpose: 'assertionMethod' })
  suite = new Ed25519Signature2020({ signer: (assertionKey as any).signer() })
  vpSuite = new DataIntegrityProof({
    signer: (assertionKey as any).signer(),
    cryptosuite: eddsaRdfc2022
  })

  // set up the ECDSA key pair (P-256), registering its key + controller docs
  ecdsaKeyPair = await EcdsaMultikey.generate({
    curve: 'P-256',
    id: ecdsaKeyId,
    controller: ecdsaController
  })
  remoteDocuments.set(
    ecdsaKeyId,
    await ecdsaKeyPair.export({ publicKey: true })
  )
  remoteDocuments.set(ecdsaController, {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: ecdsaController,
    assertionMethod: [ecdsaKeyId]
  })
})

// run tests on each version of VCs
for (const [version, mockCredential] of versionedCredentials) {
  describe(`Verifiable Credentials Data Model ${version}`, () => {
    describe('vc.issue()', () => {
      it('should issue a verifiable credential with proof', async () => {
        const credential = mockCredential()
        const verifiableCredential = await vc.issue({
          credential,
          suite,
          documentLoader
        })
        expect(verifiableCredential).toBeInstanceOf(Object)
        expect(verifiableCredential).toHaveProperty('proof')
        expect(verifiableCredential.proof).toBeInstanceOf(Object)
      })
      it('should throw an error on missing verificationMethod', async () => {
        // a suite with no signer has no verificationMethod
        const brokenSuite = new Ed25519Signature2020()
        let error: any
        try {
          await vc.issue({
            credential: mockCredential(),
            suite: brokenSuite
          })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(TypeError)
        expect(error.message).toContain(
          '"suite.verificationMethod" property is required.'
        )
      })
      if (version === 1.0) {
        it('should issue an expired verifiable credential', async () => {
          const credential = mockCredential()
          credential.id = `urn:uuid:${uuid()}`
          credential.issuer = issuerDid
          credential.expirationDate = '2020-05-31T19:21:25Z'
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            // set `now` to expiration date, allowing the credential to be
            // issued without failing the expired check
            now: new Date('2020-05-31T19:21:25Z'),
            documentLoader
          })
          expect(verifiableCredential).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty('proof')
          expect(verifiableCredential.proof).toBeInstanceOf(Object)
        })
        it('should add "issuanceDate" to verifiable credentials', async () => {
          const credential = mockCredential()
          delete credential.issuanceDate
          const now = new Date()
          const expectedIssuanceDate = `${now.toISOString().slice(0, -5)}Z`
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader,
            now
          })
          expect(verifiableCredential).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty('proof')
          expect(verifiableCredential.proof).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty(
            'issuanceDate',
            expectedIssuanceDate
          )
        })
      }
      if (version === 2.0) {
        it('should issue "validUntil" in the future', async () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validUntil = createSkewedTimeStamp({ skewYear: 1 })
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader
          })
          expect(verifiableCredential).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty('proof')
          expect(verifiableCredential).toHaveProperty(
            'validUntil',
            credential.validUntil
          )
        })
        it('should issue "validUntil" in the past', async () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validUntil = createSkewedTimeStamp({ skewYear: -1 })
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader
          })
          expect(verifiableCredential).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty('proof')
          expect(verifiableCredential).toHaveProperty(
            'validUntil',
            credential.validUntil
          )
        })
        it('should issue "validFrom" in the past', async () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: -1 })
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader
          })
          expect(verifiableCredential).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty('proof')
          expect(verifiableCredential).toHaveProperty(
            'validFrom',
            credential.validFrom
          )
        })
        it('should issue "validFrom" in the future', async () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: 1 })
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader
          })
          expect(verifiableCredential).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty('proof')
          expect(verifiableCredential).toHaveProperty(
            'validFrom',
            credential.validFrom
          )
        })
        it('should issue both "validFrom" and "validUntil"', async () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: -1 })
          credential.validUntil = createSkewedTimeStamp({ skewYear: 1 })
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader
          })
          expect(verifiableCredential).toBeInstanceOf(Object)
          expect(verifiableCredential).toHaveProperty('proof')
          expect(verifiableCredential).toHaveProperty(
            'validFrom',
            credential.validFrom
          )
          expect(verifiableCredential).toHaveProperty(
            'validUntil',
            credential.validUntil
          )
        })
      }
    })

    describe('vc.createPresentation()', () => {
      it('should create an unsigned presentation', () => {
        const presentation = vc.createPresentation({
          verifiableCredential: mockCredential(),
          id: 'test:ebc6f1c2',
          holder: 'did:ex:holder123'
        })
        expect(presentation.type).toEqual(['VerifiablePresentation'])
        expect(presentation).toHaveProperty('verifiableCredential')
        expect(presentation).toHaveProperty('id', 'test:ebc6f1c2')
        expect(presentation).toHaveProperty('holder', 'did:ex:holder123')
        expect(presentation).not.toHaveProperty('proof')
      })
    })

    describe('vc.signPresentation()', () => {
      it('should create a signed VP', async () => {
        const presentation = vc.createPresentation({
          verifiableCredential: mockCredential(),
          id: 'test:ebc6f1c2',
          holder: 'did:ex:holder123',
          version
        })
        const vp = await vc.signPresentation({
          presentation,
          suite: vpSuite, // eddsa-rdfc-2022, from beforeAll
          challenge: '12ec21',
          documentLoader
        })
        expect(vp).toHaveProperty('proof')
        expect(vp.proof).toHaveProperty('type', 'DataIntegrityProof')
        expect(vp.proof).toHaveProperty('cryptosuite', 'eddsa-rdfc-2022')
        expect(vp.proof).toHaveProperty('proofPurpose', 'authentication')
        expect(vp.proof).toHaveProperty('verificationMethod', assertionKey.id)
        expect(vp.proof).toHaveProperty('challenge', '12ec21')
        expect(vp.proof).toHaveProperty('created')
        expect(vp.proof).toHaveProperty('proofValue')
      })
    })

    describe('verify API (credentials)', () => {
      it('should verify a vc', async () => {
        const credential = mockCredential()
        credential.issuer = issuerDid
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
        expect(result.verified).toBe(true)
      })

      it('should verify a derived vc', async () => {
        const proofId = `urn:uuid:${uuid()}`
        const mandatoryPointers =
          version === 1.0 ? ['/issuer', '/issuanceDate'] : ['/issuer']
        const ecdsaSdSignSuite = new DataIntegrityProof({
          signer: ecdsaKeyPair.signer(),
          cryptosuite: createSignCryptosuite({ mandatoryPointers })
        })
        ecdsaSdSignSuite.proof = { id: proofId }
        const ecdsaSdDeriveSuite = new DataIntegrityProof({
          cryptosuite: createDiscloseCryptosuite({
            proofId,
            selectivePointers: ['/credentialSubject']
          })
        })
        const ecdsaSdVerifySuite = new DataIntegrityProof({
          cryptosuite: createVerifyCryptosuite()
        })

        const verifiableCredential = await vc.issue({
          credential: mockCredential(),
          suite: ecdsaSdSignSuite,
          documentLoader
        })
        const derivedCredential = await vc.derive({
          verifiableCredential,
          suite: ecdsaSdDeriveSuite,
          documentLoader
        })
        const result = await vc.verifyCredential({
          credential: derivedCredential,
          suite: ecdsaSdVerifySuite,
          documentLoader
        })

        if (result.error) {
          throw result.error
        }
        expect(result.verified).toBe(true)
      })

      it('should verify a vc with a positive status check', async () => {
        const credential = mockCredential()
        credential.issuer = issuerDid
        ;(credential['@context'] as unknown[]).push({
          '@context': {
            id: '@id',
            type: '@type',
            TestStatusList: {
              '@id': 'https://example.edu/TestStatusList',
              '@type': '@id'
            }
          }
        })
        credential.credentialStatus = {
          id: 'https://example.edu/status/24',
          type: 'TestStatusList'
        }
        const verifiableCredential = await vc.issue({
          credential,
          suite,
          documentLoader
        })
        const result = await vc.verifyCredential({
          credential: verifiableCredential,
          suite,
          documentLoader,
          checkStatus: async () => ({ verified: true })
        })

        if (result.error) {
          throw result.error
        }
        expect(result.verified).toBe(true)
      })

      describe('negative test', () => {
        it('fails to verify if a context resolves to null', async () => {
          const { credential, suite } = await generateCredential(mockCredential)
          ;(credential['@context'] as unknown[]).push(
            invalidContexts.nullDoc.url
          )
          const results = await vc.verifyCredential({
            suite,
            credential,
            documentLoader
          })
          expect(results.verified).toBe(false)
        })
        it('fails to verify if a context contains an invalid id', async () => {
          const { credential, suite } = await generateCredential(mockCredential)
          ;(credential['@context'] as unknown[]).push(
            invalidContexts.invalidId.url
          )
          const results = await vc.verifyCredential({
            suite,
            credential,
            documentLoader
          })
          expect(results.verified).toBe(false)
        })
        it('fails to verify if a context has a null version', async () => {
          const { credential, suite } = await generateCredential(mockCredential)
          ;(credential['@context'] as unknown[]).push(
            invalidContexts.nullVersion.url
          )
          const results = await vc.verifyCredential({
            suite,
            credential,
            documentLoader
          })
          expect(results.verified).toBe(false)
        })
        it('fails to verify if a context has a null @id', async () => {
          const { credential, suite } = await generateCredential(mockCredential)
          ;(credential['@context'] as unknown[]).push(
            invalidContexts.nullId.url
          )
          const results = await vc.verifyCredential({
            suite,
            credential,
            documentLoader
          })
          expect(results.verified).toBe(false)
        })
        it('fails to verify if a context has a null @type', async () => {
          const { credential, suite } = await generateCredential(mockCredential)
          ;(credential['@context'] as unknown[]).push(
            invalidContexts.nullType.url
          )
          const results = await vc.verifyCredential({
            suite,
            credential,
            documentLoader
          })
          expect(results.verified).toBe(false)
        })
        it('fails to verify if a context links to a missing doc', async () => {
          const { credential, suite } = await generateCredential(mockCredential)
          ;(credential['@context'] as unknown[]).push(
            'https://fsad.digitalbazaar.com'
          )
          const results = await vc.verifyCredential({
            suite,
            credential,
            documentLoader
          })
          expect(results.verified).toBe(false)
        })
        it('fails to verify if a context has an invalid url', async () => {
          const { credential, suite } = await generateCredential(mockCredential)
          ;(credential['@context'] as unknown[]).push(
            'htps://fsad.digitalbazaar.'
          )
          const results = await vc.verifyCredential({
            suite,
            credential,
            documentLoader
          })
          expect(results.verified).toBe(false)
        })
        it('should fail to verify a vc with a negative status check', async () => {
          const credential = mockCredential()
          credential.issuer = issuerDid
          ;(credential['@context'] as unknown[]).push({
            '@context': {
              id: '@id',
              type: '@type',
              TestStatusList: {
                '@id': 'https://example.edu/TestStatusList',
                '@type': '@id'
              }
            }
          })
          credential.credentialStatus = {
            id: 'https://example.edu/status/24',
            type: 'TestStatusList'
          }
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader
          })
          const result = await vc.verifyCredential({
            credential: verifiableCredential,
            suite,
            documentLoader,
            checkStatus: async () => ({ verified: false })
          })
          expect(result.verified).toBe(false)
        })
        it('should not run "checkStatus" on a vc without a "credentialStatus" property', async () => {
          const credential = mockCredential()
          credential.issuer = issuerDid
          const verifiableCredential = await vc.issue({
            credential,
            suite,
            documentLoader
          })
          const result = await vc.verifyCredential({
            credential: verifiableCredential,
            suite,
            documentLoader,
            // ensure any checkStatus call will fail verification
            checkStatus: async () => ({ verified: false })
          })
          if (result.error) {
            throw result.error
          }
          expect(result.verified).toBe(true)
        })
        it('should fail to verify a changed derived vc', async () => {
          const proofId = `urn:uuid:${uuid()}`
          const mandatoryPointers =
            version === 1.0 ? ['/issuer', '/issuanceDate'] : ['/issuer']
          const ecdsaSdSignSuite = new DataIntegrityProof({
            signer: ecdsaKeyPair.signer(),
            cryptosuite: createSignCryptosuite({ mandatoryPointers })
          })
          ecdsaSdSignSuite.proof = { id: proofId }
          const ecdsaSdDeriveSuite = new DataIntegrityProof({
            cryptosuite: createDiscloseCryptosuite({
              proofId,
              selectivePointers: ['/credentialSubject']
            })
          })
          const ecdsaSdVerifySuite = new DataIntegrityProof({
            cryptosuite: createVerifyCryptosuite()
          })

          const verifiableCredential = await vc.issue({
            credential: mockCredential(),
            suite: ecdsaSdSignSuite,
            documentLoader
          })
          const derivedCredential: any = await vc.derive({
            verifiableCredential,
            suite: ecdsaSdDeriveSuite,
            documentLoader
          })
          derivedCredential.credentialSubject.id = `urn:uuid:${uuid()}`
          const result = await vc.verifyCredential({
            credential: derivedCredential,
            suite: ecdsaSdVerifySuite,
            documentLoader
          })
          expect(result.verified).toBe(false)
        })
      })
    })

    describe('verify API (presentations)', () => {
      it('verifies a valid signed presentation', async () => {
        const challenge = uuid()

        const { presentation, suite, documentLoader } =
          await generatePresentation({ challenge, mockCredential, version })

        const result: any = await vc.verify({
          challenge,
          suite,
          documentLoader,
          presentation
        })

        if (result.error) {
          const firstError = ([] as any[]).concat(result.error)[0]
          throw firstError
        }
        expect(result.verified).toBe(true)
      })
      it('verifies an unsigned presentation', async () => {
        const {
          presentation,
          suite: vcSuite,
          documentLoader
        } = await generatePresentation({
          unsigned: true,
          mockCredential,
          version
        })

        const result: any = await vc.verify({
          documentLoader,
          presentation,
          suite: vcSuite,
          unsignedPresentation: true
        })

        if (result.error) {
          const firstError = ([] as any[]).concat(result.error)[0]
          throw firstError
        }
        expect(result.verified).toBe(true)
      })
      it('includes each credential in credentialResults by default', async () => {
        const challenge = uuid()

        const { presentation, suite, documentLoader } =
          await generatePresentation({ challenge, mockCredential, version })

        const result: any = await vc.verify({
          challenge,
          suite,
          documentLoader,
          presentation
        })

        if (result.error) {
          const firstError = ([] as any[]).concat(result.error)[0]
          throw firstError
        }
        expect(result.verified).toBe(true)
        // `includeCredentials` defaults to true, so each result should carry
        // its source credential
        for (const credentialResult of result.credentialResults) {
          expect(credentialResult.credential).toBeDefined()
          expect(credentialResult.credential).toBeInstanceOf(Object)
        }
      })
      it('omits credentials from credentialResults when includeCredentials is false', async () => {
        const challenge = uuid()

        const { presentation, suite, documentLoader } =
          await generatePresentation({ challenge, mockCredential, version })

        const result: any = await vc.verify({
          challenge,
          suite,
          documentLoader,
          presentation,
          includeCredentials: false
        })

        if (result.error) {
          const firstError = ([] as any[]).concat(result.error)[0]
          throw firstError
        }
        expect(result.verified).toBe(true)
        for (const credentialResult of result.credentialResults) {
          expect(credentialResult.credential).toBeUndefined()
          // credentialId is still populated regardless of includeCredentials
          expect(credentialResult.credentialId).toBeDefined()
        }
      })
    })

    describe('test for multiple credentials', () => {
      const credentialsCount = [5, 25, 50, 100]

      for (const count of credentialsCount) {
        it(`cause error when credentials are tampered [${count}]`, async () => {
          const challenge = uuid()
          const {
            presentation,
            suite: vcSuite,
            documentLoader
          } = await generatePresentation({
            challenge,
            credentialsCount: count,
            mockCredential,
            version
          })

          // tampering with the first two credentials id
          presentation.verifiableCredential[0].id = 'test:some_fake_id'
          presentation.verifiableCredential[1].id = 'test:some_other_fake_id'

          const result: any = await vc.verify({
            documentLoader,
            presentation,
            suite: vcSuite,
            unsignedPresentation: true
          })
          const credentialResults = result.credentialResults
          const credentialOne = credentialResults[0]
          const credentialTwo = credentialResults[1]
          const firstErrorMsg = credentialResults[0].error.errors[0].message

          expect(result.verified).toBe(false)

          expect(credentialOne.verified).toBe(false)
          expect(credentialOne.credentialId).toBe('test:some_fake_id')

          expect(credentialTwo.verified).toBe(false)
          expect(credentialTwo.credentialId).toBe('test:some_other_fake_id')

          for (let i = 2; i < credentialResults.length; ++i) {
            const credentialResult = credentialResults[i]
            expect(credentialResult.verified).toBe(true)
            expect(credentialResult.credentialId).toBeDefined()
          }

          expect(firstErrorMsg).toContain('Invalid signature.')
        })
        it('should not cause error when credentials are correct', async () => {
          const challenge = uuid()
          const {
            presentation,
            suite: vcSuite,
            documentLoader
          } = await generatePresentation({
            challenge,
            credentialsCount: count,
            mockCredential,
            version
          })
          const result: any = await vc.verify({
            documentLoader,
            presentation,
            suite: vcSuite,
            unsignedPresentation: true
          })
          const credentialResults = result.credentialResults

          expect(result.verified).toBe(true)

          for (const credentialResult of credentialResults) {
            expect(credentialResult.verified).toBe(true)
            expect(credentialResult.credentialId).toBeDefined()
          }
        })
      }
    })

    describe('_checkCredential', () => {
      it('should reject a credentialSubject.id that is not a URI', () => {
        const credential = mockCredential()
        credential.issuer = 'http://example.edu/credentials/58473'
        ;(credential.credentialSubject as Record<string, unknown>).id = '12345'
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(TypeError)
        expect(error.message).toContain('"credentialSubject.id" must be a URI')
      })

      it('should reject an issuer that is not a URI', () => {
        const credential = mockCredential()
        credential.issuer = '12345'
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(TypeError)
        expect(error.message).toContain('"issuer" must be a URI')
      })

      it('should reject credentialStatus id that is not a URI', () => {
        const credential = mockCredential()
        credential.credentialStatus = {
          id: 'not-a-url',
          type: 'urn:type'
        }
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(TypeError)
        expect(error.message).toContain('"credentialStatus.id" must be a URI')
      })

      it('should accept "credentialStatus" with no "id"', () => {
        const credential = mockCredential()
        credential.credentialStatus = {
          type: 'urn:type'
        }
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeUndefined()
      })

      it('should accept an array of "credentialStatus"', () => {
        const credential = mockCredential()
        credential.credentialStatus = [
          { id: 'https://example.edu/status/1', type: 'urn:type1' },
          { id: 'https://example.edu/status/2', type: 'urn:type2' }
        ]
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeUndefined()
      })

      it('should validate every entry in a "credentialStatus" array', () => {
        const credential = mockCredential()
        // second entry has an invalid (non-URI) id
        credential.credentialStatus = [
          { id: 'https://example.edu/status/1', type: 'urn:type1' },
          { id: 'not-a-url', type: 'urn:type2' }
        ]
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(TypeError)
        expect(error.message).toContain('"credentialStatus.id" must be a URI')
      })

      it('should reject a "credentialStatus" array entry with no type', () => {
        const credential = mockCredential()
        credential.credentialStatus = [
          { id: 'https://example.edu/status/1', type: 'urn:type1' },
          { id: 'https://example.edu/status/2' }
        ]
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error.message).toContain(
          '"credentialStatus" must include a type.'
        )
      })

      it('should reject an evidence id that is not a URI', () => {
        const credential = mockCredential()
        credential.issuer = 'did:example:12345'
        credential.evidence = '12345'
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(TypeError)
        expect(error.message).toContain('"evidence" must be a URI')
      })

      if (version === 1.0) {
        it('should reject if "expirationDate" has passed', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.expirationDate = '2020-05-31T19:21:25Z'
          let error: any
          try {
            vc._checkCredential({ credential, mode: 'verify' })
          } catch (err) {
            error = err
          }
          expect(error).toBeDefined()
          expect(error.message).toContain('Credential has expired.')
        })
        it('should reject if "now" is before "issuanceDate"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.issuanceDate = createSkewedTimeStamp({ skewYear: 1 })
          const now = new Date()
          let error: any
          try {
            vc._checkCredential({ credential, now })
          } catch (err) {
            error = err
          }
          expect(error).toBeDefined()
          expect(error.message).toContain(
            `The current date time (${now.toISOString()}) is before the ` +
              `"issuanceDate" (${credential.issuanceDate}).`
          )
        })
        it('should accept "expirationDate" in the past within "maxClockSkew"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          // expired 100 seconds ago, within the default 300s skew
          credential.expirationDate = new Date(
            Date.now() - 100 * 1000
          ).toISOString()
          let error: any
          try {
            vc._checkCredential({ credential, mode: 'verify' })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
        it('should accept "issuanceDate" in the future within "maxClockSkew"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          // issued 100 seconds in the future, within the default 300s skew
          credential.issuanceDate = new Date(
            Date.now() + 100 * 1000
          ).toISOString()
          let error: any
          try {
            vc._checkCredential({ credential })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
      }
      if (version === 2.0) {
        it('should reject "validFrom" in the future', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: 1 })
          const now = new Date()
          let error: any
          try {
            vc._checkCredential({ credential, now })
          } catch (err) {
            error = err
          }
          expect(error).toBeDefined()
          expect(error.message).toContain(
            `The current date time (${now.toISOString()}) is before ` +
              `"validFrom" (${credential.validFrom})`
          )
        })
        it('should accept "validFrom" in the past', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: -1 })
          let error: any
          try {
            vc._checkCredential({ credential })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
        it('should reject "validUntil" in the past', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validUntil = createSkewedTimeStamp({ skewYear: -1 })
          const now = new Date()
          let error: any
          try {
            vc._checkCredential({ credential, now })
          } catch (err) {
            error = err
          }
          expect(error).toBeDefined()
          expect(error.message).toContain(
            `The current date time (${now.toISOString()}) is after ` +
              `"validUntil" (${credential.validUntil})`
          )
        })
        it('should accept "validUntil" in the future', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validUntil = createSkewedTimeStamp({ skewYear: 1 })
          let error: any
          try {
            vc._checkCredential({ credential })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
        it('should accept if now is between "validFrom" & "validUntil"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: -1 })
          credential.validUntil = createSkewedTimeStamp({ skewYear: 1 })
          let error: any
          try {
            vc._checkCredential({ credential })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
        it('should accept if "validFrom" & "validUntil" are the same time', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          const now = createSkewedTimeStamp({ skewYear: 0 })
          credential.validFrom = now
          credential.validUntil = now
          let error: any
          try {
            vc._checkCredential({ credential, now })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
        it('should reject if now is after "validFrom" & "validUntil"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: -2 })
          credential.validUntil = createSkewedTimeStamp({ skewYear: -1 })
          const now = new Date()
          let error: any
          try {
            vc._checkCredential({ credential, now })
          } catch (err) {
            error = err
          }
          expect(error).toBeDefined()
          expect(error.message).toContain(
            `The current date time (${now.toISOString()}) is after ` +
              `"validUntil" (${credential.validUntil}).`
          )
        })
        it('should reject if now is before "validFrom" & "validUntil"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validFrom = createSkewedTimeStamp({ skewYear: 1 })
          credential.validUntil = createSkewedTimeStamp({ skewYear: 2 })
          const now = new Date()
          let error: any
          try {
            vc._checkCredential({ credential })
          } catch (err) {
            error = err
          }
          expect(error).toBeDefined()
          expect(error.message).toContain(
            `The current date time (${now.toISOString()}) is before ` +
              `"validFrom" (${credential.validFrom}).`
          )
        })
        it('should accept "validUntil" in the past within "maxClockSkew"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          // validUntil 100 seconds in the past, within the default 300s skew
          credential.validUntil = new Date(
            Date.now() - 100 * 1000
          ).toISOString()
          let error: any
          try {
            vc._checkCredential({ credential })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
        it('should reject "validUntil" in the past beyond "maxClockSkew"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          credential.validUntil = new Date(
            Date.now() - 100 * 1000
          ).toISOString()
          const now = new Date()
          let error: any
          try {
            // tighten skew to 0 so the 100s-past "validUntil" is rejected
            vc._checkCredential({ credential, now, maxClockSkew: 0 })
          } catch (err) {
            error = err
          }
          expect(error).toBeDefined()
          expect(error.message).toContain(
            `"validUntil" (${credential.validUntil}).`
          )
        })
        it('should accept "validFrom" in the future within "maxClockSkew"', () => {
          const credential = mockCredential()
          credential.issuer = 'did:example:12345'
          // validFrom 100 seconds in the future, within the default 300s skew
          credential.validFrom = new Date(Date.now() + 100 * 1000).toISOString()
          let error: any
          try {
            vc._checkCredential({ credential })
          } catch (err) {
            error = err
          }
          expect(error).toBeUndefined()
        })
      }
      it('should reject if "credentialSubject" is empty', () => {
        const credential = mockCredential()
        credential.credentialSubject = {}
        credential.issuer = 'did:example:12345'
        if (version === 1.0) {
          credential.issuanceDate = '2022-10-31T19:21:25Z'
        }
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error.message).toContain(
          '"credentialSubject" must make a claim.'
        )
      })
      it('should reject if a "credentialSubject" is empty', () => {
        const credential = mockCredential()
        credential.credentialSubject = [{}, { id: 'did:key:zFoo' }]
        credential.issuer = 'did:example:12345'
        if (version === 1.0) {
          credential.issuanceDate = '2022-10-31T19:21:25Z'
        }
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeDefined()
        expect(error.message).toContain(
          '"credentialSubject" must make a claim.'
        )
      })

      it('should accept multiple credentialSubjects', () => {
        const credential = mockCredential()
        credential.credentialSubject = [
          { id: 'did:key:zFoo' },
          { name: 'did key' }
        ]
        credential.issuer = 'did:example:12345'
        if (version === 1.0) {
          credential.issuanceDate = '2022-10-31T19:21:25Z'
        }
        let error: any
        try {
          vc._checkCredential({ credential })
        } catch (err) {
          error = err
        }
        expect(error).toBeUndefined()
      })
    })
  })
}

/**
 * Issues a credential signed by a fresh `did:key` Ed25519 issuer, returning the
 * signed credential plus a verify suite. Used by the negative-context and
 * presentation tests.
 */
async function generateCredential(makeCredential: () => any): Promise<{
  credential: any
  suite: LinkedDataProof
  methodFor: (options: { purpose: string }) => any
}> {
  const credential = makeCredential()
  const { didDocument, methodFor } = await didKey.generate()
  credential.issuer = didDocument.id
  credential.id = `http://example.edu/credentials/${uuid()}`

  const assertionMethodKey = methodFor({ purpose: 'assertionMethod' })
  const signSuite = new Ed25519Signature2020({
    signer: assertionMethodKey.signer()
  })
  const signed = await vc.issue({
    credential,
    suite: signSuite,
    documentLoader
  })

  return {
    credential: signed,
    suite: new Ed25519Signature2020(),
    methodFor
  }
}

/**
 * Builds a presentation (optionally signed) wrapping one or more freshly issued
 * credentials. Mirrors the upstream helper, but uses `did:key` Ed25519 keys.
 */
async function generatePresentation({
  challenge,
  unsigned = false,
  credentialsCount = 1,
  mockCredential,
  version
}: {
  challenge?: string
  unsigned?: boolean
  credentialsCount?: number
  mockCredential: () => any
  version: number
}): Promise<{
  presentation: any
  suite: LinkedDataProof | LinkedDataProof[]
  documentLoader: typeof documentLoader
}> {
  const credentials: any[] = []
  for (let i = 0; i < credentialsCount; i++) {
    const { credential } = await generateCredential(mockCredential)
    credentials.push(credential)
  }

  const presentation = vc.createPresentation({
    verifiableCredential: credentials,
    version
  })

  if (unsigned) {
    // inner credentials are signed with the Ed25519 2020 suite
    return {
      presentation,
      suite: new Ed25519Signature2020(),
      documentLoader
    }
  }

  // sign the presentation with a fresh did:key authentication key, using the
  // eddsa-rdfc-2022 Multikey suite (carries `challenge` under both VC contexts)
  const { methodFor } = await generateCredential(mockCredential)
  const authenticationKey = methodFor({ purpose: 'authentication' })
  const presentationSuite = new DataIntegrityProof({
    signer: authenticationKey.signer(),
    cryptosuite: eddsaRdfc2022
  })

  const vp = await vc.signPresentation({
    presentation,
    suite: presentationSuite,
    challenge,
    documentLoader
  })

  // verifying needs to cover the inner VC (2020) and the VP (rdfc) proofs
  return {
    presentation: vp,
    suite: [
      new Ed25519Signature2020(),
      new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 })
    ],
    documentLoader
  }
}
