/** Módulo compartido (NO es un test): evita que catalogo.seed.ts y
 *  catalogo.teardown.ts se importen entre sí y terminen registrando el
 *  test() del otro en el proyecto equivocado. */
export const TITULO_SEED_CATALOGO = 'E2E Catálogo Base (no borrar durante la corrida)';
