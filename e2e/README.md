# e2e — Playwright (Beneficios para Egresados)

Suite end-to-end que ejercita los tres repos juntos (`egresados_cliente` →
`egresados_service` → `egresados_crud`) contra servicios **reales**: login
real por WSO2, JIT provisioning real (Ágora / terceros_crud / sga_mid), y
subida de documentos real al gestor documental institucional. No hay mocks.

## Por qué está aquí (y no en un repo aparte)

Playwright conduce el navegador contra `egresados_cliente`; vivir en este
repo es lo más simple para arrancar. La contrapartida es que hay que levantar
`egresados_crud` y `egresados_service` por separado (ver sus propios
`README.md`) — no hay docker-compose todavía.

## Requisitos previos

1. **`egresados_crud`** corriendo en `:8080` con Postgres (`db/schema.sql` aplicado).
2. **`egresados_service`** corriendo en `:8081` (`go run .`), apuntando a los
   servicios institucionales reales (no uses `VALIDAR_JWT=false` ni
   `PARAMETROS_LOCAL` pensando en ahorrarte pasos: los tokens son reales y el
   MID los valida con normalidad).
3. **`egresados_cliente`** corriendo en `:4200` (`npm start`).
4. Dos cuentas institucionales de prueba REALES (no inventadas):
   - Una con perfil de **egresado** (debe existir en terceros_crud/SGA).
   - Una vinculada a una **empresa ACTIVA** en Ágora.

   Sin esto el suite no puede correr: el login es real, no hay bypass.

## Configuración

```bash
cp e2e/.env.example e2e/.env
# completar E2E_EGRESADO_USERNAME/PASSWORD y E2E_EMPRESA_USERNAME/PASSWORD
```

```bash
npm install
npx playwright install chromium
```

## Ejecución

```bash
npm run e2e              # headless, los 3 repos deben estar corriendo
npm run e2e:ui            # modo UI de Playwright (recomendado para depurar)
npm run e2e:report        # abre el último reporte HTML
```

Ejecutar un subconjunto:

```bash
npx playwright test --config=e2e/playwright.config.ts --project=egresado
npx playwright test --config=e2e/playwright.config.ts --project=cross-role
```

## Cómo está organizado

```
auth/
  env.ts               variables de entorno (falla rápido si falta alguna)
  login.helper.ts       login REAL contra WSO2 (selectores: #username, #password, botón "Sign in")
  egresado.setup.ts     ejecuta y VERIFICA el login real de egresado; guarda storageState
  empresa.setup.ts      ejecuta y VERIFICA el login real de empresa; guarda storageState
  storage.ts             rutas ABSOLUTAS del storageState (única fuente de verdad; ver nota abajo)
seed/
  catalogo.seed.ts       publica un beneficio persistente ANTES de los tests de catálogo
  catalogo.teardown.ts   lo retira al final de TODA la corrida (proyecto teardown de Playwright)
tests/
  egresado/             specs que reutilizan la sesión de egresado (storageState)
  empresa/               specs que reutilizan la sesión de empresa (storageState)
  cross-role/            specs que abren AMBAS sesiones a la vez (2 BrowserContext)
                          para flujos que cruzan de un rol al otro (publicar → solicitar → responder)
  unauth/                specs sin sesión (guards, redirecciones a /login)
fixtures/
  documento-prueba.pdf   PDF mínimo válido para los flujos de subida de documentos
```

El login real ocurre **una sola vez por rol y por corrida** (proyectos
`setup-egresado`/`setup-empresa`) — el resto de specs reutiliza el
`storageState` guardado en `playwright/.auth/*.json` para no repetir el flujo
OAuth completo (más lento y sujeto a la disponibilidad del IdP) en cada test.
Esos archivos y `.env` están en `.gitignore`: contienen tokens/credenciales
reales, nunca se versionan.

## Datos de prueba y limpieza

No hay seed de base de datos tradicional: la identidad de egresado/empresa se
crea sola en el primer login real (JIT provisioning). Los beneficios que
crean los specs de `empresa/` y `cross-role/` usan títulos con timestamp
(`E2E Beneficio <ts>`) y se **retiran en un bloque `finally`** al final de
cada test, para no acumular datos ni acercarse al límite de solicitudes
activas por egresado (RN-010, default 5).

**Excepción — catálogo del egresado:** `tests/egresado/catalogo.spec.ts`
necesita que exista al menos un beneficio real *antes* de correr, y no puede
depender de que `tests/empresa/beneficios.spec.ts` haya corrido primero (el
orden entre proyectos de Playwright no está garantizado, y ese spec además
retira lo que publica). Para esto, `seed-catalogo` extiende el mismo patrón
`setup`/`teardown` que ya se usa para el login, pero para **datos**: publica
un beneficio persistente (`E2E Catálogo Base…`) antes de que arranque el
proyecto `egresado`, y su `teardown` (`teardown-catalogo`) lo retira recién
cuando TODO lo que depende de `seed-catalogo` terminó — no en cada test, sino
una vez por corrida completa.

## Flujos cubiertos hoy

| RF | Flujo | Archivo |
|---|---|---|
| RF-001/RF-004 | Login real (egresado / empresa) | `auth/*.setup.ts` |
| RF-002 | Catálogo: búsqueda, categoría, "solo con cupos", detalle | `tests/egresado/catalogo.spec.ts` |
| RF-005 | Publicar / editar / retirar beneficio | `tests/empresa/beneficios.spec.ts` |
| RF-003/006/007/008 | Ciclo completo: solicitar con documento → requiere info → mensaje → aprobar con comprobante | `tests/cross-role/ciclo-solicitud.spec.ts` |
| RN-002c | Devolución de cupo (rechazo y cancelación) | `tests/cross-role/rechazo-y-cancelacion.spec.ts` |
| Guards | Cruce de rol, sesión ausente | `tests/*/guards.spec.ts`, `tests/unauth/sin-sesion.spec.ts` |

## Pendiente de extender (no cubierto todavía)

- RN-010 (límite de 5 solicitudes activas): requiere publicar 6 beneficios distintos, es pesado — buen candidato para un spec aparte cuando el suite esté estabilizado.
- RF-013 (resumen de actividad) y selector multiempresa (caso 1:N de Ágora): dependen de que la cuenta de prueba tenga ese caso real.
- Anti-IDOR (403 al operar recursos de otro usuario): requiere una tercera cuenta de prueba (otro egresado) para intentar acceder a un radicado ajeno.

## Nota sobre CI

Por ahora el suite corre solo local (decisión explícita: evitar resolver
todavía cómo un pipeline Drone clona/orquesta los 3 repos). Cuando se
integre, cada corrida seguirá necesitando las credenciales reales vía
variables de entorno (secretos de Drone), no vía `.env`.
