import { test as setup, expect } from '@playwright/test';
import { loginReal } from './login.helper';
import { env } from './env';
import { EGRESADO_STORAGE } from './storage';

/**
 * Este "setup" ES el test del flujo de login real (F1/RF-001): hace el login
 * completo contra WSO2 con una cuenta de egresado de prueba, y verifica que el
 * portal aterriza en /catalogo con el perfil ya resuelto. El storageState que
 * guarda al final lo reutilizan los demás specs de tests/egresado/** para no
 * repetir el login real (más lento y sujeto a la disponibilidad del IdP) en
 * cada test.
 */
setup('login real de egresado → aterriza en catálogo', async ({ page }) => {
  await loginReal(page, env.egresadoUsername, env.egresadoPassword, /#\/catalogo/);

  // Confirma que el perfil de egresado quedó resuelto (nav propia del rol)
  await expect(page.getByRole('link', { name: 'Mis solicitudes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Catálogo' })).toBeVisible();

  await page.context().storageState({ path: EGRESADO_STORAGE });
});
