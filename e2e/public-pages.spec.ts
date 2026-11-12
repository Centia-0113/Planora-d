import { expect, test } from '@playwright/test'

test.describe('Public pages', () => {
  test('landing page presents Planora and links to registration', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Life. Your Goals.')
    await page.getByRole('link', { name: /create your free account/i }).click()
    await expect(page).toHaveURL(/\/register$/)
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  })

  test('login page links to password recovery', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  })

  test('registration validates input in the browser', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Your name is required.')).toBeVisible()
    await expect(page.getByText('Email is required.')).toBeVisible()
  })

  test('unknown routes show the 404 page', async ({ page }) => {
    await page.goto('/does-not-exist')
    await expect(page.getByRole('heading', { name: 'We couldn’t find that page' })).toBeVisible()
  })

  test('the landing page has no horizontal scroll', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('Protected routes', () => {
  for (const path of ['/dashboard', '/tasks', '/settings']) {
    test(`${path} redirects signed-out visitors to /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    })
  }
})
