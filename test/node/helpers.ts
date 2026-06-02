/*!
 * Copyright (c) 2019-2023 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Creates an ISO DateTime string skewed by a number of years from a base date.
 *
 * @param options - Options to use.
 * @param options.date - An optional base date (defaults to now).
 * @param options.skewYear - The number of years to add (may be negative).
 *
 * @returns An ISO DateTime string (seconds precision, `Z` suffix).
 */
export function createSkewedTimeStamp({
  date = new Date(),
  skewYear
}: {
  date?: Date
  skewYear: number
}): string {
  date.setFullYear(date.getFullYear() + skewYear)
  const isoString = date.toISOString()
  return `${isoString.substring(0, isoString.length - 5)}Z`
}
