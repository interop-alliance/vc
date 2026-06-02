/*!
 * Copyright (c) 2019-2022 Digital Bazaar, Inc. All rights reserved.
 */
import { describe, expect, it } from 'vitest'
import * as vc from '../../src/index.js'

function assertDateTime(date: string, expected: boolean): void {
  expect(vc.dateRegex.test(date)).toBe(expected)
}

describe('verifies XML Schema DateTime', () => {
  describe('positive', () => {
    it('should accept an ISOString', () => {
      const latest = new Date().toISOString()
      assertDateTime(latest, true)
    })
    it('should accept a date with a 4 digit year', () => {
      assertDateTime('2019-03-26T14:00:00Z', true)
    })
    it('should accept a date with a > 4 digit year', () => {
      assertDateTime('99999-03-26T14:00:00Z', true)
    })
    it('should accept a date with a negative 4 digit year', () => {
      assertDateTime('-9999-03-26T14:00:00Z', true)
    })
    it('should accept 24:00 as an hour', () => {
      assertDateTime('2019-03-26T24:00:00Z', true)
    })
    it('should accept a positive offset', () => {
      assertDateTime('2019-03-26T24:00:00+05:00', true)
    })
    it('should accept a negative offset', () => {
      assertDateTime('2019-03-26T24:00:00-05:00', true)
    })
    it('should accept a date not ending in a z', () => {
      assertDateTime('2019-03-26T14:00:00', true)
    })
  })
  describe('negative', () => {
    it('should not accept an empty string', () => {
      assertDateTime('', false)
    })
    it('should not accept a date with lowercase t', () => {
      assertDateTime('2019-03-26t14:00:00Z', false)
    })
    it('should not accept a date with "/" as a separator', () => {
      assertDateTime('2017/09/27', false)
    })
    it('should not accept 2 digit years', () => {
      assertDateTime('17-09-27T22:07:22.563Z', false)
    })
    it('should not accept a basic ISO DateTime', () => {
      assertDateTime('20190326T1400Z', false)
    })
    it('should not accept 00 as a month', () => {
      assertDateTime('2019-00-26T14:00:00Z', false)
    })
    it('should not accept 13 as a month', () => {
      assertDateTime('2019-13-26T14:00:00Z', false)
    })
    it('should not accept 00 as a day', () => {
      assertDateTime('2019-01-00T14:00:00Z', false)
    })
    it('should not accept 32 as a day', () => {
      assertDateTime('2019-01-32T14:00:00Z', false)
    })
    it('should not accept a time past midnight', () => {
      assertDateTime('2019-03-25T24:01:00Z', false)
    })
  })
})
