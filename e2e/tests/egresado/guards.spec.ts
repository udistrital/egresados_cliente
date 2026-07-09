import { test, expect } from '@playwright/test';

/** Guard de rol cruzado (auth.guard.ts): un egresado no puede entrar al portal de empresa. */
test('un egresado que intenta /empresa/dashboard es redirigido a su propio portal', async ({ page }) => {
  await page.goto('/#/empresa/dashboard');
  await expect(page).toHaveURL(/#\/catalogo/);
});
