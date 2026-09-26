import { expect, test } from '@playwright/test'

test('admin panel loads', async ({ page }) => {
  await page.goto('/admin')
  await page.fill('#field-email', 'dev@almut.ir')
  await page.fill('#field-password', 'test')
  await page.click('.form-submit button')

  await expect(page).toHaveTitle(/Dashboard/)
  await expect(
    page.getByRole('heading', { name: 'Collections' }),
  ).toBeVisible({ timeout: 15_000 })
})

test('post edit view shows the SEO preview tabs', async ({ page }) => {
  // The AI step at the end may hit a live provider (when a key is
  // configured) or surface a client-side error (when not) — either way the
  // panel must never throw an uncaught exception.
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(String(err)))

  await page.goto('/admin')
  await page.fill('#field-email', 'dev@almut.ir')
  await page.fill('#field-password', 'test')
  await page.click('.form-submit button')

  await expect(
    page.getByRole('heading', { name: 'Collections' }),
  ).toBeVisible({ timeout: 15_000 })

  const slug = `preview-test-post-${Date.now()}`
  const postResponse = await page.request.post('/api/posts', {
    data: { slug, title: 'Preview test post' },
  })

  expect(postResponse.ok()).toBeTruthy()

  const post = (await postResponse.json()) as { doc: { id: number | string } }

  await page.goto(`/admin/collections/posts/${post.doc.id}`)

  // SERP/OG/Twitter preview and the analysis panel share the Preview tab.
  const previewTab = page.getByRole('button', { name: 'Preview', exact: true })

  await expect(previewTab).toBeVisible({ timeout: 15_000 })

  // Tab clicks can land before the form finishes hydrating; retry until the
  // preview panel actually renders.
  await expect(async () => {
    await previewTab.click()
    await expect(
      page.getByRole('heading', { name: 'Preview test post - localhost:3000' }),
    ).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 20_000 })

  await expect(page.getByRole('button', { name: 'OpenGraph' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Twitter / X' }).first()).toBeVisible()

  const analysisButton = page.getByRole('button', { name: 'Run analysis' })

  await expect(analysisButton).toBeVisible()
  await analysisButton.click()
  await expect(page.locator('text=Score:').first()).toBeVisible({
    timeout: 15_000,
  })

  // Readability section renders after the analysis endpoint responds.
  await expect(page.locator('text=Readability: Flesch').first()).toBeVisible({
    timeout: 15_000,
  })

  // Schema validation lives in the Schema tab, next to the schemaType field.
  const schemaTab = page.getByRole('button', { name: 'Schema', exact: true })

  await expect(schemaTab).toBeVisible()
  await schemaTab.click()

  const schemaButton = page.getByRole('button', { name: 'Validate schema' })

  await expect(schemaButton).toBeVisible()
  await schemaButton.click()
  await expect(
    page.locator('text=Select a schema type first.').first(),
  ).toBeVisible({ timeout: 15_000 })

  // The AI generation panel lives at the end of the Content tab; switch back
  // from Schema and wait through hydration before asserting the button.
  const contentTab = page.getByRole('button', { name: 'Content', exact: true })
  const aiButton = page.getByRole('button', { name: /Generate with AI|Generating…/ })

  await expect(async () => {
    await contentTab.click()
    await expect(aiButton).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 20_000 })
  await aiButton.click()

  // With a configured provider this performs a live request (button flips to
  // its "Generating…" label while in flight); without one it surfaces the
  // provider error as UI state. Neither may throw uncaught.
  await expect(aiButton).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('gsc admin view renders', async ({ page }) => {
  await page.goto('/admin')
  await page.fill('#field-email', 'dev@almut.ir')
  await page.fill('#field-password', 'test')
  await page.click('.form-submit button')

  await page.goto('/admin/seo/gsc')
  await expect(page.locator('text=Search Console').first()).toBeVisible({
    timeout: 15_000,
  })
})

test('analytics admin view renders overview', async ({ page }) => {
  await page.goto('/admin')
  await page.fill('#field-email', 'dev@almut.ir')
  await page.fill('#field-password', 'test')
  await page.click('.form-submit button')

  await expect(
    page.getByRole('heading', { name: 'Collections' }),
  ).toBeVisible({ timeout: 15_000 })

  await page.goto('/admin/seo/analytics')

  const overview = page.locator('text=Avg. audit score:').first()

  await expect(overview).toBeVisible({ timeout: 30_000 })
})

test('frontend demo page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'alamut-seo dev frontend' })).toBeVisible({
    timeout: 15_000,
  })
})
