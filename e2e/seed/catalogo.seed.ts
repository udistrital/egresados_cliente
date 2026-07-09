import { test, expect } from '@playwright/test';
import { TITULO_SEED_CATALOGO } from './constants';

/**
 * Los specs de tests/egresado/catalogo.spec.ts necesitan que exista al menos
 * un beneficio real, publicado y con cupos, ANTES de correr — no pueden
 * depender de que tests/empresa/beneficios.spec.ts haya corrido primero (el
 * orden entre proyectos no está garantizado, y ese spec además retira lo que
 * publica). Este proyecto ("seed-catalogo") publica un beneficio persistente
 * usando la sesión real de empresa (storageState de setup-empresa, ver
 * playwright.config.ts) antes de que arranque el proyecto "egresado", y
 * seed/catalogo.teardown.ts lo retira al final de TODA la corrida.
 */
test('publica un beneficio persistente para que el catálogo del egresado no esté vacío', async ({ page }) => {
  await page.goto('/#/empresa/beneficios');
  await expect(page.locator('.sk-row')).toHaveCount(0); // espera el JIT real de empresa

  // "Mis beneficios" nunca borra el historial: tarjetas RETIRADAS de corridas
  // anteriores siguen listadas con el mismo título. Solo cuenta como "ya
  // publicado" una tarjeta ACTIVA — el botón "Retirar beneficio" únicamente
  // lo renderiza el template si estadoPublicacion !== 'retirado' — si no
  // filtramos por eso, una corrida vieja ya retirada hace que esta rama se
  // salte la publicación y el catálogo del egresado quede vacío.
  const activo = page.locator('.benef-mgmt-card', { hasText: TITULO_SEED_CATALOGO })
    .filter({ has: page.getByRole('button', { name: 'Retirar beneficio' }) });

  if (await activo.count() > 0) return; // ya hay una activa publicada — no duplicar

  await page.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();
  await page.locator('#pub-titulo').fill(TITULO_SEED_CATALOGO);
  await page.locator('#pub-categoria').selectOption({ index: 1 });
  await page.locator('#pub-cupos').fill('999');
  await page.locator('#pub-vigencia').fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await page.locator('#pub-resumen').fill('Beneficio fijo publicado por el suite e2e para que el catálogo nunca esté vacío.');
  await page.locator('#pub-condiciones').fill('Ser egresado activo de la Universidad Distrital.');
  await page.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();

  await expect(activo).toBeVisible();
});
