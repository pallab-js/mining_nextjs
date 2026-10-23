import { test, expect } from '@playwright/test'

test('home loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Operations Overview')).toBeVisible()
})

test('settings page loads', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.getByText('Settings & Administration')).toBeVisible()
})
