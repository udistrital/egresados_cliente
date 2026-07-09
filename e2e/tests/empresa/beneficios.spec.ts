import { test, expect } from '@playwright/test';

/** RF-005 — Publicar, editar y retirar beneficios (empresa ACTIVA, RN-008b). */
test.describe('Gestión de beneficios (empresa)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/empresa/beneficios');
    await expect(page.getByRole('heading', { name: /gestión de/i })).toBeVisible();

    // El JIT de empresa (Ágora, real) resuelve async; `publicar()` lee
    // sesion.empresaId de forma SÍNCRONA y falla con "Sesión sin empresa
    // local (JIT pendiente)" si se hace click antes de que termine. El
    // skeleton de carga (`cargandoBeneficios`) solo desaparece cuando el
    // observable gateado por empresaId != null ya emitió — es la señal
    // correcta para esperar antes de interactuar con el formulario.
    await expect(page.locator('.sk-row')).toHaveCount(0);
  });

  test('publicar, editar y retirar un beneficio (ciclo completo, autolimpiado)', async ({ page }) => {
    const titulo = `E2E Beneficio ${Date.now()}`;
    const vigencia = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);

    // ── Publicar ──────────────────────────────────────────────
    await page.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();

    await page.locator('#pub-titulo').fill(titulo);
    await page.locator('#pub-categoria').selectOption({ index: 1 });
    await page.locator('#pub-cupos').fill('5');
    await page.locator('#pub-vigencia').fill(vigencia);
    await page.locator('#pub-resumen').fill('Beneficio de prueba generado por el suite e2e.');
    await page.locator('#pub-condiciones').fill('Ser egresado activo de la Universidad Distrital.');

    // Documento requerido (se usa en tests/cross-role/ciclo-solicitud.spec.ts)
    await page.getByRole('button', { name: 'Agregar documento requerido' }).click();
    await page.locator('#doc-nombre-0').fill('Hoja de vida');
    await page.locator('#doc-descripcion-0').fill('Actualizada, máximo 6 meses');

    await page.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();

    const card = page.locator('.benef-mgmt-card', { hasText: titulo });
    await expect(card).toBeVisible();
    await expect(card.getByText('Activo')).toBeVisible();

    // ── Editar ────────────────────────────────────────────────
    await card.getByRole('button', { name: 'Editar beneficio' }).click();
    await expect(page.getByRole('heading', { name: 'Editar beneficio' })).toBeVisible();
    await page.locator('#pub-resumen').fill('Beneficio de prueba (editado por e2e).');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(card.getByText('Beneficio de prueba (editado por e2e).')).toBeVisible();

    // ── Retirar (limpieza: no deja datos de prueba activos en catálogo) ─────
    page.once('dialog', dialog => dialog.accept());
    await card.getByRole('button', { name: 'Retirar beneficio' }).click();

    await expect(card.getByText('Retirado')).toBeVisible();
  });
});
