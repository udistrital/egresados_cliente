# Spec — Lineamientos OATI para el frontend

> **Última actualización:** 2026-07-10 · Deriva de `LINEAMIENTOS_OATI.md`
> (mayo 2026), actualizado al estado real del repo. Marca: ✅ confirmado ·
> ⚠️ por confirmar con OATI.

## Objetivo

Fijar las restricciones institucionales (OATI/OAS) que el micro-frontend debe
cumplir para integrarse al SGA.

## Alcance

**In scope:** arquitectura de microfrontends, stack, convenciones de nombres,
autenticación, variables de entorno, CI/CD y no funcionales.
**Out of scope:** la funcionalidad del módulo (ver `specs/cliente-ui/spec.md`).

## Repos involucrados

`sga_cliente_beneficios_egresados_mf`; para la integración final: `sga_cliente_root` y `core_mf_cliente` (shell institucional).

## Requisitos

### 1. Arquitectura
1. ✅ El SGA usa **microfrontends Single-SPA**; cada módulo es un repo `sga_cliente_<modulo>_mf`. En producción conviven Root (orquestador) + Core (layout y auth del shell) + este MF.
2. ⚠️ **Estado actual del repo:** bootstrap Angular normal con login OIDC propio — funciona standalone para desarrollo y demo. El empaque single-spa-angular y la convivencia con el Core (quién parsea el callback OAuth) es el trabajo de integración pendiente.
3. ⚠️ **Compatibilidad de versión con `single-spa-angular`:** el repo está en Angular 20.3 (actualizado 2026-07-10). A esa fecha, `single-spa-angular@9.x` soporta oficialmente Angular hasta la 18; Angular 19 solo tiene un beta sin publicar en estable y Angular 20 no tiene release (issue abierto en su repo). Confirmar con OATI el orden de estas dos migraciones antes de empacar como Single-SPA.

### 2. Stack
1. ✅ **Angular 20.3** + Angular Material 20 + Bootstrap 5 (alineado con el MF de referencia `sga_cliente_notas_mf`). Builder clásico `browser` (webpack) mantenido a propósito — `single-spa-angular` requiere salida SystemJS, que el builder `application`/esbuild no soporta (ver sección 1 y README).
2. ✅ RxJS 7, SweetAlert2 (heredado del servicio de auth); ngx-translate ⚠️ (no aplicado aún).
3. ⚠️ Pruebas unitarias con Jest y hooks husky (lineamiento; hoy no hay tests).

### 3. Convenciones de nombres
1. ✅ Repo GitHub en snake_case (`sga_cliente_beneficios_egresados_mf`); proyecto Angular en kebab-case (`beneficios-egresados-mf`).
2. ✅ Ramas: el repo usa `main` (el lineamiento histórico menciona `develop`/`master`; alinear al integrarse a la organización `udistrital`).
3. ⛔ No usar el generador `plantilla_cliente_oas` (Hygen): generación anterior, no produce Single-SPA.

### 4. Autenticación
1. El lineamiento original dice "la autenticación la maneja el Core, no el MF". **Realidad actual:** este MF SÍ implementa el login (necesario para operar standalone); al integrarse al shell habrá que delegar en el Core y conservar solo el consumo del token. Ver `specs/system/autenticacion/spec.md` (repo `egresados_service`).
2. ✅ Bloque `TOKEN` en `environment.ts` (AUTORIZATION_URL, CLIENTE_ID, SCOPE, REDIRECT_URL, …). ⚠️ Valores de producción los entrega OATI (D-6) — no inventarlos.

### 5. CI/CD y calidad
1. ⚠️ Drone (`.drone.yml`) reportando a `hubci.portaloas.udistrital.edu.co` — requerido al pasar a la organización `udistrital`.
2. ✅ Licencia GPL-3.0 (ecosistema OAS).

### 6. No funcionales
1. Validación bidireccional: feedback inmediato en el cliente; la validación final es del backend.
2. Ley 1581/2012: minimización de datos personales en pantallas; TLS 1.2+.
3. Rendimiento: catálogo < 2 s (p95) → paginación obligatoria (implementada).
4. Disponibilidad ≥ 99% mensual en horario hábil (objetivo institucional).

## Criterios de aceptación

1. El MF se monta en el shell Single-SPA del SGA sin colisiones de rutas ni doble parseo del callback OAuth (pendiente — criterio de la integración).
2. `environment.prod.ts` completo con los valores entregados por OATI (sin placeholders).
3. Pipeline Drone verde en la organización `udistrital`.

## Casos borde

- El guard del SGA no compara roles: valida la URL contra el árbol de menú de `CONF_MENU_SERVICE` por rol — sin menú registrado (D-8) el usuario queda fuera aunque el rol exista.
- Roles con `/` (internos WSO2) se descartan en el shell; usuario sin roles ⇒ menú de ASPIRANTE.
