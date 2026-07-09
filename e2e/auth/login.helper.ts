import { Page, expect } from '@playwright/test';
import { env } from './env';

/**
 * Ejecuta el login REAL contra WSO2 (OIDC Implicit Flow) — sin mocks, tal como
 * lo haría un usuario: click en el portal → formulario de WSO2 → credenciales
 * → callback con el token en el hash de la URL → la app resuelve el perfil
 * (userRol) y enruta a /catalogo o /empresa/dashboard.
 *
 * Selectores del formulario de WSO2 (confirmados en el IdP institucional):
 *   #username, #password, botón "Sign in".
 *
 * @param destino  patrón de la ruta destino esperada tras resolver el perfil
 *                 (D-5: la rama egresado/empresa se decide DESPUÉS del login).
 */
export async function loginReal(page: Page, username: string, password: string, destino: RegExp): Promise<void> {
  await page.goto('/');

  const botonContinuar = page.getByRole('button', { name: /continuar con cuenta institucional/i });
  await expect(botonContinuar).toBeVisible({ timeout: env.loginTimeout });
  await botonContinuar.click();

  // Redirect al IdP institucional (dominio externo, fuera de nuestro control)
  await page.waitForURL(/autenticacion\.portaloas\.udistrital\.edu\.co/, { timeout: env.loginTimeout });

  const campoUsuario = page.locator('#username');
  await campoUsuario.waitFor({ state: 'visible', timeout: env.loginTimeout });
  await campoUsuario.fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Callback de vuelta al portal con el token en el hash (#id_token=...) y,
  // tras resolver userRol, el enrutado al portal correspondiente (D-5).
  await page.waitForURL(destino, { timeout: env.loginTimeout });
}
