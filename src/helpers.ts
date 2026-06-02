/*!
 * Copyright (c) 2023 Digital Bazaar, Inc. All rights reserved.
 */
import * as credentialsContext from 'credentials-context'
import * as credentialsContextV2 from '@digitalcredentials/credentials-v2-context'

import type { IVerifiableCredential } from '@interop/data-integrity-core'

export const CREDENTIALS_CONTEXT_V1_URL: string =
  credentialsContext.constants.CREDENTIALS_CONTEXT_V1_URL
export const CREDENTIALS_CONTEXT_V2_URL: string =
  credentialsContextV2.constants.CONTEXT_URL

// Z and T must be uppercase
// xml schema date time RegExp
// @see https://www.w3.org/TR/xmlschema11-2/#dateTime
export const dateRegex = new RegExp(
  '-?([1-9][0-9]{3,}|0[0-9]{3})' +
    '-(0[1-9]|1[0-2])' +
    '-(0[1-9]|[12][0-9]|3[01])' +
    'T(([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](.[0-9]+)?|(24:00:00(.0+)?))' +
    '(Z|(\\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))?'
)

// entries should be in ascending version order
// so v1 is entry 0
const credentialContextUrls = new Set<string>([
  CREDENTIALS_CONTEXT_V1_URL,
  CREDENTIALS_CONTEXT_V2_URL
])

/**
 * Asserts that a context array's first item is a credentials context.
 *
 * @throws {Error} If the first context is not a credentials context.
 */
export function assertCredentialContext({
  context
}: {
  context: unknown[]
}): void {
  // ensure first context is credentials context url
  if (credentialContextUrls.has(context[0] as string) === false) {
    // throw if the first context is not a credentials context
    throw new Error(
      `"${CREDENTIALS_CONTEXT_V1_URL}" or "${CREDENTIALS_CONTEXT_V2_URL}"` +
        ' needs to be first in the list of contexts.'
    )
  }
}

/**
 * Throws if a Date is not in the correct format.
 *
 * @throws {Error} Throws if the date is not a proper date string.
 */
export function assertDateString({
  credential,
  prop
}: {
  credential: Record<string, unknown>
  prop: string
}): void {
  const value = credential[prop]
  if (!dateRegex.test(value as string)) {
    throw new Error(`"${prop}" must be a valid date: ${value}`)
  }
}

/**
 * Turns the first context in a VC into a numbered version.
 *
 * @returns A number representing the version.
 */
function getContextVersion({
  credential
}: {
  credential?: IVerifiableCredential
}): number {
  const firstContext = credential?.['@context']?.[0]
  return [...credentialContextUrls].indexOf(firstContext as string) + 1
}

/**
 * Checks if a VC is using a specific context version.
 *
 * @returns True if the first context matches the version.
 */
export function checkContextVersion({
  credential,
  version
}: {
  credential?: IVerifiableCredential
  version: number
}): boolean {
  return getContextVersion({ credential }) === version
}

/**
 * Compares two times with consideration of max clock skew.
 *
 * `maxClockSkew` is in seconds. Returns a number greater than, equal to, or
 * less than zero, comparable to a sort comparator.
 */
export function compareTime({
  t1,
  t2,
  maxClockSkew
}: {
  t1: Date | number
  t2: Date | number
  maxClockSkew: number
}): number {
  const ms1 = Number(t1)
  const ms2 = Number(t2)
  // `maxClockSkew` is in seconds, so transform to milliseconds
  if (Math.abs(ms1 - ms2) < maxClockSkew * 1000) {
    // times are equal within the max clock skew
    return 0
  }
  return ms1 < ms2 ? -1 : 1
}
