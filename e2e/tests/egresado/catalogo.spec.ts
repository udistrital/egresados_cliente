import { test, expect } from '@playwright/test';

/** RF-002 — Catálogo de beneficios con filtros y paginación. */
test.describe('Catálogo de beneficios (egresado)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/catalogo');
    // level: 1 — la página también tiene un <h2> "Beneficios por ser
    // egresado UD" (sección institucional estática) que matchea /beneficios/i
    // y rompía este locator en modo estricto.
    await expect(page.getByRole('heading', { name: /beneficios/i, level: 1 })).toBeVisible();
  });

  test('lista el catálogo y refleja el contador de resultados', async ({ page }) => {
    const contador = page.locator('.cat-filters__count strong');
    await expect(contador).toBeVisible();
    const total = Number(await contador.textContent());
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('buscar por una palabra clave inexistente vacía la grilla', async ({ page }) => {
    await page.locator('input[placeholder*="Buscar por nombre"]').fill('zzzz-no-existe-e2e-zzzz');
    await expect(page.getByText('No encontramos beneficios con esos filtros')).toBeVisible();

    await page.getByRole('button', { name: 'Restablecer filtros' }).click();
    await expect(page.getByText('No encontramos beneficios con esos filtros')).toHaveCount(0);
  });

  test('filtrar por categoría no rompe la grilla', async ({ page }) => {
    const select = page.locator('.cat-filters__group', { hasText: 'Categoría' }).locator('select');
    const opciones = await select.locator('option').count();
    test.skip(opciones <= 1, 'No hay categorías reales cargadas en este ambiente todavía');

    await select.selectOption({ index: 1 });
    // No debe haber error visible ni quedar en el estado de carga indefinidamente
    await expect(page.locator('.cat-filters__count strong')).toBeVisible();
  });

  test('toggle "solo con cupos" nunca aumenta el conteo de resultados', async ({ page }) => {
    const contador = page.locator('.cat-filters__count strong');
    const antes = Number(await contador.textContent());

    await page.getByLabel('Sólo con cupos disponibles').check({ force: true }).catch(async () => {
      // El checkbox está envuelto en un <label> custom sin control accesible estándar
      await page.locator('.cat-filters__toggle input[type="checkbox"]').check({ force: true });
    });

    const despues = Number(await contador.textContent());
    expect(despues).toBeLessThanOrEqual(antes);
  });

  test('ver detalle de un beneficio desde la card', async ({ page }) => {
    const primeraCard = page.locator('.benef-card').first();
    test.skip((await primeraCard.count()) === 0, 'No hay beneficios publicados en este ambiente todavía');

    const titulo = await primeraCard.locator('.benef-card__title').textContent();
    await primeraCard.getByRole('link', { name: 'Ver detalle' }).click();

    await expect(page).toHaveURL(/#\/beneficios\/\d+/);
    await expect(page.getByRole('heading', { name: titulo ?? '' })).toBeVisible();
  });
});
