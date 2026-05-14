import { test, expect } from '@playwright/test';

test('login page renders and navigation works', async ({ page }) => {
  await page.goto('/login');
  await page.waitForURL('**/login');

  await expect(page.locator('text=Welcome back')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();

  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL('/register');
  await expect(page.locator('text=Create your workspace')).toBeVisible();
});
