/** Lee y valida las variables de entorno del suite (falla rápido y claro si falta alguna). */
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copia e2e/.env.example a e2e/.env y complétala ` +
      `con credenciales de una cuenta institucional de prueba real.`,
    );
  }
  return valor;
}

export const env = {
  baseUrl: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
  crudUrl: process.env['E2E_CRUD_URL'] ?? 'http://localhost:8080/v1',
  midUrl: process.env['E2E_MID_URL'] ?? 'http://localhost:8081/v1',
  loginTimeout: Number(process.env['E2E_LOGIN_TIMEOUT'] ?? 30_000),

  get egresadoUsername() { return requerida('E2E_EGRESADO_USERNAME'); },
  get egresadoPassword() { return requerida('E2E_EGRESADO_PASSWORD'); },
  get empresaUsername() { return requerida('E2E_EMPRESA_USERNAME'); },
  get empresaPassword() { return requerida('E2E_EMPRESA_PASSWORD'); },
};
