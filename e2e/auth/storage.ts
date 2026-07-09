import * as path from 'path';

/**
 * Rutas ABSOLUTAS del storageState guardado por los proyectos de setup.
 * Se calculan desde __dirname (no desde process.cwd()) a propósito: el
 * script `e2e` invoca `playwright test --config=e2e/playwright.config.ts`
 * desde la raíz del repo, así que cualquier ruta relativa aquí podría
 * resolverse distinto según quién la lea (config vs. runtime del setup) y
 * producir un ENOENT como el que motivó este archivo.
 */
const authDir = path.join(__dirname, '..', 'playwright', '.auth');

export const EGRESADO_STORAGE = path.join(authDir, 'egresado.json');
export const EMPRESA_STORAGE = path.join(authDir, 'empresa.json');
