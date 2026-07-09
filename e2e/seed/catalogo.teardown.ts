import { test, expect } from '@playwright/test';
import { TITULO_SEED_CATALOGO } from './constants';

/** Teardown de seed-catalogo (ver catalogo.seed.ts): corre después de que
 *  TODOS los proyectos que dependen de seed-catalogo terminaron. */
test('retira el beneficio persistente del catálogo al terminar la corrida', async ({ page }) => {
  await page.goto('/#/empresa/beneficios');
  await expect(page.locator('.sk-row')).toHaveCount(0);

  // Solo tarjetas ACTIVAS (con el botón "Retirar beneficio" visible) —
  // las ya retiradas de corridas anteriores no tienen ese botón y no hay
  // nada que hacer con ellas. Se retiran todas las que matcheen (defensivo:
  // en el flujo normal debería ser una sola).
  const activo = page.locator('.benef-mgmt-card', { hasText: TITULO_SEED_CATALOGO })
    .filter({ has: page.getByRole('button', { name: 'Retirar beneficio' }) });

  let restantes = await activo.count();
  while (restantes > 0) {
    page.once('dialog', dialog => dialog.accept());
    await activo.first().getByRole('button', { name: 'Retirar beneficio' }).click();
    await expect(activo).toHaveCount(restantes - 1);
    restantes = await activo.count();
  }
});
