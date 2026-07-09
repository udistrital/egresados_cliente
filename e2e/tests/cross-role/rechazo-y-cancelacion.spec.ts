import { test, expect, Page } from '@playwright/test';
import { EGRESADO_STORAGE, EMPRESA_STORAGE } from '../../auth/storage';

/**
 * page.goto() a una ruta en la que la página ya estuvo antes no garantiza
 * que Angular vuelva a pedir los datos — y acá el cambio de cupos suele
 * venir de la OTRA página/rol. Forzar un reload real evita leer estado en
 * memoria desactualizado (ver la misma nota en ciclo-solicitud.spec.ts).
 */
async function irFresco(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta);
  await page.reload();
}

/**
 * Devolución de cupo (RN-002c) en las dos rutas posibles: rechazo por la
 * empresa y cancelación por el egresado. Reutiliza un único beneficio (sin
 * documentos requeridos) para ambos sub-casos: `yaSolicitado()` solo
 * considera solicitudes en estados NO finales, así que tras resolver la
 * primera (rechazada) el egresado puede volver a solicitar el mismo
 * beneficio para el segundo sub-caso (cancelada).
 */
test.describe('Devolución de cupo (empresa ⇄ egresado)', () => {
  test('rechazo por la empresa y cancelación por el egresado devuelven el cupo', async ({ browser }) => {
    const empresaCtx = await browser.newContext({ storageState: EMPRESA_STORAGE });
    const egresadoCtx = await browser.newContext({ storageState: EGRESADO_STORAGE });
    const empresaPage = await empresaCtx.newPage();
    const egresadoPage = await egresadoCtx.newPage();

    const titulo = `E2E Cupo ${Date.now()}`;

    async function cuposCard() {
      await irFresco(empresaPage, '/#/empresa/beneficios');
      const card = empresaPage.locator('.benef-mgmt-card', { hasText: titulo });
      await expect(card).toBeVisible();
      return (await card.locator('.benef-mgmt-card__cupo-val').textContent())?.trim();
    }

    async function solicitar(): Promise<string> {
      // El JIT de egresado resuelve async; crearSolicitud() lee
      // sesion.egresadoId de forma SÍNCRONA — "Mis solicitudes" tiene un
      // skeleton atado a esa misma condición (ver ciclo-solicitud.spec.ts).
      await egresadoPage.goto('/#/solicitudes');
      await expect(egresadoPage.locator('.sk-row')).toHaveCount(0);

      await egresadoPage.goto('/#/catalogo');
      await egresadoPage.locator('input[placeholder*="Buscar por nombre"]').fill(titulo);
      const card = egresadoPage.locator('.benef-card', { hasText: titulo });
      await card.getByRole('button', { name: 'Solicitar' }).click();
      await egresadoPage.locator('.smodal__acepta input[type="checkbox"]').check({ force: true });
      await egresadoPage.getByRole('button', { name: 'Confirmar solicitud' }).click();
      await expect(egresadoPage.getByText('¡Solicitud radicada!')).toBeVisible();
      const radicado = (await egresadoPage.locator('.smodal__radicado-num').textContent())?.trim() ?? '';
      expect(radicado).toMatch(/^BNF-\d{4}-\d{6}$/);
      await egresadoPage.getByRole('button', { name: 'Seguir explorando' }).click();
      return radicado;
    }

    try {
      await test.step('empresa publica beneficio con 2 cupos', async () => {
        await empresaPage.goto('/#/empresa/beneficios');
        // Espera a que el JIT de empresa (Ágora, real) resuelva antes de
        // publicar — ver nota en tests/empresa/beneficios.spec.ts.
        await expect(empresaPage.locator('.sk-row')).toHaveCount(0);
        await empresaPage.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();
        await empresaPage.locator('#pub-titulo').fill(titulo);
        await empresaPage.locator('#pub-categoria').selectOption({ index: 1 });
        await empresaPage.locator('#pub-cupos').fill('2');
        await empresaPage.locator('#pub-vigencia')
          .fill(new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10));
        await empresaPage.locator('#pub-resumen').fill('Beneficio e2e sin documentos requeridos.');
        await empresaPage.locator('#pub-condiciones').fill('Ser egresado activo UD.');
        await empresaPage.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();
        await expect(empresaPage.locator('.benef-mgmt-card', { hasText: titulo })).toBeVisible();
      });

      await test.step('rechazo devuelve el cupo', async () => {
        const radicado1 = await solicitar();
        await expect.poll(cuposCard).toBe('1 / 2');

        await irFresco(empresaPage, '/#/empresa/dashboard');
        await empresaPage.locator('.solicitudes__search input').fill(radicado1);
        const fila = empresaPage.locator('.emp-solicitud-row', { hasText: radicado1 });
        await fila.getByRole('button', { name: 'Rechazar solicitud' }).click();
        await empresaPage.locator('.resp-panel__textarea')
          .fill('Cupos reservados para otro programa en este periodo.');
        await empresaPage.getByRole('button', { name: 'Confirmar rechazo' }).click();
        await expect(fila.getByText('Rechazada')).toBeVisible();

        await expect.poll(cuposCard).toBe('2 / 2');
      });

      await test.step('cancelación por el egresado devuelve el cupo', async () => {
        const radicado2 = await solicitar();
        await expect.poll(cuposCard).toBe('1 / 2');

        await irFresco(egresadoPage, '/#/solicitudes');
        await egresadoPage.locator('.sol-search input').fill(radicado2);
        const fila = egresadoPage.locator('.sol-row', { hasText: radicado2 });
        await fila.getByTitle('Cancelar solicitud').click();
        await expect(fila.getByText('Cancelada')).toBeVisible();

        await expect.poll(cuposCard).toBe('2 / 2');
      });
    } finally {
      await empresaPage.goto('/#/empresa/beneficios');
      const card = empresaPage.locator('.benef-mgmt-card', { hasText: titulo });
      if (await card.count() > 0) {
        empresaPage.once('dialog', dialog => dialog.accept());
        await card.getByRole('button', { name: 'Retirar beneficio' }).click().catch(() => {});
      }
      await empresaCtx.close();
      await egresadoCtx.close();
    }
  });
});
