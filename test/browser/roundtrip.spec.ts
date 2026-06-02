import { test, expect } from '@playwright/test'

/**
 * Exercises the full issue + verify path in real Chromium, to confirm the
 * library and its dependency chain (jsonld, jsonld-signatures, the Ed25519
 * suites, and the `did:key` security document loader) actually work in a
 * browser bundle.
 */
test('issue/verify roundtrip works in the browser', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(String(err)))

  await page.goto('/test/index.html')
  const result = await page.evaluate(async () => {
    // Resolved by the Vite dev server at runtime (it rewrites the bare
    // `@interop/*` imports inside the entry module); not resolvable by tsc.
    // @ts-expect-error -- absolute URL served by Vite, not a tsc module path
    const { runRoundtrip } = await import('/test/browser/roundtrip.entry.ts')
    return runRoundtrip()
  })

  expect(errors, errors.join('\n')).toHaveLength(0)
  expect(result.hasProof).toBe(true)
  expect(result.verified).toBe(true)
})
