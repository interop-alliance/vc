/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Malformed JSON-LD contexts used by the negative verification tests. Each is
 * registered with the test document loader under its `url` so that a credential
 * referencing it fails verification in a specific way (null `@id`, null
 * `@type`, null `@version`, an invalid term id, or a context that resolves to
 * `null`).
 */

const invalidId = {
  '@context': [
    {
      '@version': 1.1
    },
    'https://w3id.org/security/v2',
    {
      cred: 'https://w3.org/2018/credentials#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      Policy: 'cred:Policy',
      VerifiableCredential: 'cred:VerifiableCredential',
      VerifiablePresentation: 'cred:VerifiablePresentation',
      credentialStatus: { '@id': 'cred:credentialStatus', '@type': '@id' },
      credentialSubject: { '@id': 'cred:credentialSubject', '@type': '@id' },
      // invalid: `id` instead of `@id`
      evidence: { id: 'cred:evidence', '@type': '@id' },
      expirationDate: { '@id': 'cred:expirationDate', '@type': 'xsd:dateTime' },
      issuanceDate: { '@id': 'cred:issuanceDate', '@type': 'xsd:dateTime' },
      issuer: { '@id': 'cred:issuer', '@type': '@id' },
      revocation: { '@id': 'cred:revocation', '@type': '@id' },
      termsOfUse: { '@id': 'cred:termsOfUse', '@type': '@id' },
      verifiableCredential: {
        '@id': 'cred:verifiableCredential',
        '@type': '@id',
        '@container': '@graph'
      },
      referenceId: 'cred:referenceId'
    }
  ]
}

const nullId = {
  '@context': [
    {
      '@version': 1.1,
      '@id': null
    },
    'https://w3id.org/security/v2',
    {
      cred: 'https://w3.org/2018/credentials#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      Policy: 'cred:Policy',
      VerifiableCredential: 'cred:VerifiableCredential',
      VerifiablePresentation: 'cred:VerifiablePresentation',
      credentialStatus: { '@id': 'cred:credentialStatus', '@type': '@id' },
      credentialSubject: { '@id': 'cred:credentialSubject', '@type': '@id' },
      evidence: { '@id': 'cred:evidence', '@type': '@id' },
      expirationDate: { '@id': 'cred:expirationDate', '@type': 'xsd:dateTime' },
      issuanceDate: { '@id': 'cred:issuanceDate', '@type': 'xsd:dateTime' },
      issuer: { '@id': 'cred:issuer', '@type': '@id' },
      revocation: { '@id': 'cred:revocation', '@type': '@id' },
      termsOfUse: { '@id': 'cred:termsOfUse', '@type': '@id' },
      verifiableCredential: {
        '@id': 'cred:verifiableCredential',
        '@type': '@id',
        '@container': '@graph'
      },
      referenceId: 'cred:referenceId'
    }
  ]
}

const nullType = {
  '@context': [
    {
      '@version': 1.1
    },
    'https://w3id.org/security/v2',
    {
      cred: 'https://w3.org/2018/credentials#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      Policy: 'cred:Policy',
      VerifiableCredential: 'cred:VerifiableCredential',
      VerifiablePresentation: 'cred:VerifiablePresentation',
      credentialStatus: { '@id': 'cred:credentialStatus', '@type': null },
      credentialSubject: { '@id': 'cred:credentialSubject', '@type': '@id' },
      evidence: { '@id': 'cred:evidence', '@type': '@id' },
      expirationDate: { '@id': 'cred:expirationDate', '@type': 'xsd:dateTime' },
      issuanceDate: { '@id': 'cred:issuanceDate', '@type': 'xsd:dateTime' },
      issuer: { '@id': 'cred:issuer', '@type': '@id' },
      revocation: { '@id': 'cred:revocation', '@type': '@id' },
      termsOfUse: { '@id': 'cred:termsOfUse', '@type': '@id' },
      verifiableCredential: {
        '@id': 'cred:verifiableCredential',
        '@type': '@id',
        '@container': '@graph'
      },
      referenceId: 'cred:referenceId'
    }
  ]
}

const nullVersion = {
  '@context': [
    {
      '@version': null
    },
    {
      cred: 'https://w3.org/2018/credentials#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      Policy2: 'cred:Policy',
      VerifiableCredential: 'cred:VerifiableCredential',
      VerifiablePresentation: 'cred:VerifiablePresentation',
      credentialStatus: { '@id': 'cred:credentialStatus', '@type': '@id' },
      credentialSubject: { '@id': 'cred:credentialSubject', '@type': '@id' },
      evidence: { '@id': 'cred:evidence', '@type': '@id' },
      expirationDate: { '@id': 'cred:expirationDate', '@type': 'xsd:dateTime' },
      issuanceDate: { '@id': 'cred:issuanceDate', '@type': 'xsd:dateTime' },
      issuer: { '@id': 'cred:issuer', '@type': '@id' },
      revocation: { '@id': 'cred:revocation', '@type': '@id' },
      termsOfUse: { '@id': 'cred:termsOfUse', '@type': '@id' },
      verifiableCredential: {
        '@id': 'cred:verifiableCredential',
        '@type': '@id',
        '@container': '@graph'
      },
      referenceId: 'cred:referenceId'
    }
  ]
}

export interface InvalidContext {
  url: string
  value: unknown
}

export const invalidContexts = {
  invalidId: {
    url: 'https://invalid-id.org',
    value: invalidId
  },
  nullVersion: {
    url: 'https://null-version.org',
    value: nullVersion
  },
  nullId: {
    url: 'https://null-id.org',
    value: nullId
  },
  nullType: {
    url: 'https://null-type.org',
    value: nullType
  },
  nullDoc: {
    url: 'https://null-doc.org',
    value: null
  }
} satisfies Record<string, InvalidContext>
