import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { EGRESADO_STORAGE, EMPRESA_STORAGE } from './auth/storage';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

/**
 * Sin mocks: cada corrida hace login REAL contra WSO2 y llama a los
 * servicios institucionales reales (Ágora, terceros_crud, gestor
 * documental). Por eso el login se ejecuta UNA vez por rol (proyectos
 * "setup") y el resto de specs reutiliza el storageState resultante,
 * en vez de repetir el flujo OAuth completo en cada test.
 */
export default defineConfig({
  // '.' (no './tests'): los proyectos de setup viven en auth/*.setup.ts,
  // fuera de tests/. Cada proyecto ya acota su propio testMatch con el
  // prefijo correcto ('tests/...' o 'auth/...'), así que basta con que
  // Playwright escanee todo el directorio del config para encontrarlos.
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // datos reales compartidos (cupos, límite RN-010): evitar carreras
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'report', open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup-egresado',
      testMatch: /auth\/egresado\.setup\.ts/,
    },
    {
      name: 'setup-empresa',
      testMatch: /auth\/empresa\.setup\.ts/,
    },
    {
      // Publica un beneficio persistente (con la sesión real de empresa)
      // ANTES de que corran los tests de catálogo — si no, catalogo.spec.ts
      // puede encontrarse el catálogo vacío según el estado real de la BD.
      // teardown-catalogo lo retira al final de toda la corrida.
      name: 'seed-catalogo',
      testMatch: /seed\/catalogo\.seed\.ts/,
      dependencies: ['setup-empresa'],
      teardown: 'teardown-catalogo',
      use: {
        ...devices['Desktop Chrome'],
        storageState: EMPRESA_STORAGE,
      },
    },
    {
      name: 'teardown-catalogo',
      testMatch: /seed\/catalogo\.teardown\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: EMPRESA_STORAGE,
      },
    },
    {
      name: 'egresado',
      testMatch: /tests\/egresado\/.*\.spec\.ts/,
      dependencies: ['setup-egresado', 'seed-catalogo'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: EGRESADO_STORAGE,
      },
    },
    {
      name: 'empresa',
      testMatch: /tests\/empresa\/.*\.spec\.ts/,
      dependencies: ['setup-empresa'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: EMPRESA_STORAGE,
      },
    },
    {
      name: 'cross-role',
      testMatch: /tests\/cross-role\/.*\.spec\.ts/,
      dependencies: ['setup-egresado', 'setup-empresa'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'unauth',
      testMatch: /tests\/unauth\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }, // sin storageState: contexto anónimo a propósito
    },
  ],
});
