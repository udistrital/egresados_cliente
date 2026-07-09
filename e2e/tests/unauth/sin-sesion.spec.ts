import { test, expect } from '@playwright/test';

/**
 * authGuard/rolEgresadoGuard/rolEmpresaGuard sin sesión (sin token en
 * localStorage): cualquier ruta protegida debe caer a /login. Corre en el
 * proyecto "unauth", con un contexto anónimo (sin storageState).
 */
for (const ruta of ['/#/catalogo', '/#/solicitudes', '/#/empresa/dashboard', '/#/empresa/beneficios']) {
  test(`sin sesión, ${ruta} redirige a /login`, async ({ page }) => {
    await page.goto(ruta);
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('button', { name: /continuar con cuenta institucional/i })).toBeVisible();
  });
}
