import { test, expect } from '@playwright/test';

/** Guard de rol cruzado (auth.guard.ts): una empresa no puede entrar al portal de egresado. */
test('una empresa que intenta /catalogo es redirigida a su propio portal', async ({ page }) => {
  await page.goto('/#/catalogo');
  await expect(page).toHaveURL(/#\/empresa\/dashboard/);
});
