import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { EGRESADO_STORAGE, EMPRESA_STORAGE } from '../../auth/storage';

const DOC_PRUEBA = path.resolve(__dirname, '../../fixtures/documento-prueba.pdf');

/**
 * Un page.goto() a la MISMA ruta en la que la página ya está (p. ej. volver a
 * "/#/solicitudes" cuando nunca se salió de ahí, solo se cerró un drawer) no
 * garantiza que Angular vuelva a pedir los datos — y acá el cambio que
 * queremos ver lo hizo el OTRO rol, en otra página/contexto. Forzar un
 * reload real evita leer el estado en memoria que quedó desactualizado.
 */
async function irFresco(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta);
  await page.reload();
}

/**
 * Ciclo de vida completo de una solicitud (RF-003/RF-006/RF-007/RF-008), con
 * ambos roles reales interactuando sobre el MISMO beneficio y radicado:
 *
 *   empresa publica (con documento requerido)
 *     → egresado solicita y sube el documento
 *     → empresa pide información (REQUIERE_INFO)
 *     → egresado responde por el hilo (auto-transición a EN_REVISION, RN-005)
 *     → empresa aprueba con comprobante
 *     → egresado ve la solicitud aprobada + el comprobante
 *
 * Usa dos BrowserContext (uno por rol) con el storageState real guardado por
 * auth/*.setup.ts. Al final retira el beneficio para no dejar datos de
 * prueba activos en el catálogo real.
 */
test.describe('Ciclo de vida de una solicitud (empresa ⇄ egresado)', () => {
  test('publicar → solicitar → requerir info → responder → aprobar', async ({ browser }) => {
    const empresaCtx = await browser.newContext({ storageState: EMPRESA_STORAGE });
    const egresadoCtx = await browser.newContext({ storageState: EGRESADO_STORAGE });
    const empresaPage = await empresaCtx.newPage();
    const egresadoPage = await egresadoCtx.newPage();

    const titulo = `E2E Ciclo ${Date.now()}`;
    let radicado = '';

    try {
      await test.step('empresa publica un beneficio con documento requerido', async () => {
        await empresaPage.goto('/#/empresa/beneficios');
        // Espera a que el JIT de empresa (Ágora, real) resuelva antes de
        // publicar — ver nota en tests/empresa/beneficios.spec.ts.
        await expect(empresaPage.locator('.sk-row')).toHaveCount(0);
        await empresaPage.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();

        await empresaPage.locator('#pub-titulo').fill(titulo);
        await empresaPage.locator('#pub-categoria').selectOption({ index: 1 });
        await empresaPage.locator('#pub-cupos').fill('3');
        await empresaPage.locator('#pub-vigencia')
          .fill(new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10));
        await empresaPage.locator('#pub-resumen').fill('Beneficio e2e con documento requerido.');
        await empresaPage.locator('#pub-condiciones').fill('Ser egresado activo UD.');

        await empresaPage.getByRole('button', { name: 'Agregar documento requerido' }).click();
        await empresaPage.locator('#doc-nombre-0').fill('Hoja de vida');
        await empresaPage.locator('#doc-descripcion-0').fill('Actualizada, máximo 6 meses');

        await empresaPage.getByRole('button', { name: 'Publicar beneficio', exact: true }).click();
        await expect(empresaPage.locator('.benef-mgmt-card', { hasText: titulo })).toBeVisible();
      });

      await test.step('egresado encuentra el beneficio y solicita', async () => {
        // El JIT de egresado (terceros_crud/sga_mid, real) resuelve async; el
        // catálogo carga independiente de eso, pero crearSolicitud() lee
        // sesion.egresadoId de forma SÍNCRONA y falla con "Tu perfil de
        // egresado aún no está habilitado" si se solicita antes de tiempo.
        // "Mis solicitudes" sí tiene un skeleton atado a esa misma condición.
        await egresadoPage.goto('/#/solicitudes');
        await expect(egresadoPage.locator('.sk-row')).toHaveCount(0);

        await egresadoPage.goto('/#/catalogo');
        await egresadoPage.locator('input[placeholder*="Buscar por nombre"]').fill(titulo);

        const card = egresadoPage.locator('.benef-card', { hasText: titulo });
        await expect(card).toBeVisible();
        await card.getByRole('button', { name: 'Solicitar' }).click();

        await egresadoPage.locator('.smodal__acepta input[type="checkbox"]').check({ force: true });
        await egresadoPage.getByRole('button', { name: 'Confirmar solicitud' }).click();

        // Fase "documentos": el beneficio exige un PDF antes de cerrar
        await expect(egresadoPage.getByText('¡Solicitud radicada! Ahora sube tus documentos')).toBeVisible();
        radicado = (await egresadoPage.locator('.smodal__radicado-num').textContent())?.trim() ?? '';
        expect(radicado).toMatch(/^BNF-\d{4}-\d{6}$/);

        const docItem = egresadoPage.locator('.doc-item', { hasText: 'Hoja de vida' });
        await docItem.locator('input[type="file"]').setInputFiles(DOC_PRUEBA);
        await expect(docItem.getByText('documento-prueba.pdf')).toBeVisible({ timeout: 15_000 });

        await egresadoPage.getByRole('button', { name: 'Continuar' }).click();
        await expect(egresadoPage.getByText('¡Solicitud radicada!')).toBeVisible();
      });

      await test.step('empresa pide información adicional', async () => {
        await empresaPage.goto('/#/empresa/dashboard');
        await empresaPage.locator('.solicitudes__search input').fill(radicado);

        const fila = empresaPage.locator('.emp-solicitud-row', { hasText: radicado });
        await expect(fila).toBeVisible();
        await fila.getByRole('button', { name: 'Requiere información' }).click();

        await empresaPage.locator('.resp-panel__textarea').fill('Por favor adjunta tu hoja de vida firmada.');
        await empresaPage.getByRole('button', { name: 'Enviar solicitud de info' }).click();

        await expect(fila.getByText('Requiere info')).toBeVisible();
      });

      await test.step('egresado responde por el hilo de mensajes (auto-transición a EN_REVISION)', async () => {
        await egresadoPage.goto('/#/solicitudes');
        await egresadoPage.locator('.sol-search input').fill(radicado);

        const fila = egresadoPage.locator('.sol-row', { hasText: radicado });
        await expect(fila).toBeVisible();
        await fila.getByTitle('Ver detalle').click();

        await expect(egresadoPage.getByText('La empresa necesita información adicional')).toBeVisible();
        await egresadoPage.locator('.hilo__compose textarea').fill('Listo, adjunté la hoja de vida firmada.');
        await egresadoPage.locator('.hilo__send').click();

        await expect(egresadoPage.locator('.drawer').getByText('En revisión')).toBeVisible();
      });

      await test.step('empresa aprueba con comprobante', async () => {
        // empresaPage ya estaba en /#/empresa/dashboard desde el paso
        // anterior; el cambio de estado lo hizo el egresado en OTRA página.
        await irFresco(empresaPage, '/#/empresa/dashboard');
        await empresaPage.locator('.solicitudes__search input').fill(radicado);

        const fila = empresaPage.locator('.emp-solicitud-row', { hasText: radicado });
        await fila.getByRole('button', { name: 'Aprobar solicitud' }).click();

        await empresaPage.locator('.resp-panel__textarea').fill('Beneficio otorgado. Bienvenido.');
        await empresaPage.locator('.resp-panel__field:has-text("Comprobante") input[type="file"]')
          .setInputFiles(DOC_PRUEBA);
        await expect(empresaPage.getByText('documento-prueba.pdf')).toBeVisible();

        await empresaPage.getByRole('button', { name: 'Confirmar aprobación' }).click();
        await expect(fila.getByText('Aprobada')).toBeVisible();
      });

      await test.step('egresado ve la solicitud aprobada con el comprobante de la empresa', async () => {
        // Mismo caso: egresadoPage nunca salió de /#/solicitudes (solo cerró
        // el drawer), y la aprobación la hizo la empresa en otra página.
        await irFresco(egresadoPage, '/#/solicitudes');
        await egresadoPage.locator('.sol-search input').fill(radicado);

        const fila = egresadoPage.locator('.sol-row', { hasText: radicado });
        await expect(fila.getByText('Aprobada')).toBeVisible();

        await fila.getByTitle('Ver detalle').click();
        await expect(egresadoPage.getByRole('heading', { name: 'Comprobante de la empresa' })).toBeVisible();
      });
    } finally {
      // Limpieza: retira el beneficio de prueba (la solicitud ya quedó en
      // estado final APROBADA, no cuenta contra el límite RN-010).
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
