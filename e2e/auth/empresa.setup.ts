import { test as setup, expect } from '@playwright/test';
import { loginReal } from './login.helper';
import { env } from './env';
import { EMPRESA_STORAGE } from './storage';

/**
 * Login real de empresa (F13/RF-004): la identidad se resuelve vía Ágora (JIT
 * provisioning) contra el correo de la cuenta WSO2 — sin formulario propio.
 * Igual que egresado.setup.ts, este test ES la verificación del flujo de
 * login; el storageState resultante lo reutilizan tests/empresa/**.
 */
setup('login real de empresa → aterriza en dashboard', async ({ page }) => {
  await loginReal(page, env.empresaUsername, env.empresaPassword, /#\/empresa\/dashboard/);

  await expect(page.getByRole('link', { name: 'Mis beneficios' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /solicitudes recibidas/i })).toBeVisible();

  await page.context().storageState({ path: EMPRESA_STORAGE });
});
