# Spec — Micro-frontend (`sga_cliente_beneficios_egresados_mf`)

> **Última actualización:** 2026-07-10 · **Estado:** integrado end-to-end con el
> MID real (modo demo eliminado el 2026-07-02). Deriva de `CONTEXTO_PROYECTO.md`
> y `LINEAMIENTOS_OATI.md`, actualizado a la arquitectura real.

## Objetivo

UI del módulo para los dos perfiles (egresado y empresa) en Angular 20.3,
consumiendo exclusivamente el MID. Validación de feedback inmediato en cliente;
la validación autoritativa es del backend.

## Alcance

**In scope:** vistas de egresado (catálogo, detalle, mis solicitudes, perfil) y
de empresa (dashboard/bandeja, mis beneficios, publicar/editar), login OIDC,
sesión y selector multiempresa.
**Out of scope:** lógica de negocio (cupos, estados, radicados — todo en el MID),
pantallas de administrador (espera D-8), redención RF-009.

## Repos involucrados

- `sga_cliente_beneficios_egresados_mf` (este) — Angular 20.3 + Angular Material; empaque Single-SPA pendiente (hoy bootstrap Angular normal, builder clásico `browser` por compatibilidad con `single-spa-angular`, ver README).
- Consume: `sga_mid_beneficios_egresados` (única API) + WSO2 (login).

## Arquitectura por capas

1. **Cliente HTTP** (`core/api/beneficios-mid.service.ts`): espeja 1:1 las rutas del MID y desenvuelve el envelope `{Status, Success, Body, Message}`. DTOs en `core/api/api.types.ts` (espejo de los JSON tags Go); mapeadores DTO→UI en `core/api/mappers.ts`.
2. **Fachadas** (`core/services/`): `BeneficiosService`, `SolicitudesService`, `EmpresaService` — los componentes solo dependen de ellas (Observables). Reactivas a la sesión (`distinctUntilChanged` sobre `egresadoId`/`empresaId`): recargan solas cuando el JIT resuelve o cambia la empresa activa.
3. **Sesión** (`UsuarioSesionService`): centraliza la identidad del token; tras el login dispara el JIT del perfil correspondiente y hace `patch()` (merge parcial — evita que los flujos asíncronos concurrentes se pisen). Para empresa guarda TODAS las empresas (`empresas: EmpresaVinculada[]`, cada una con su NIT) y la activa se cambia con `seleccionarEmpresa()` (persistida en localStorage por correo).
4. **Auth** (`ImplicitAutenticationService` + `AuthInterceptor`): implicit flow OIDC; el interceptor solo anexa Bearer (NO fuerza re-login en 401 — evita bucles con el SSO). Guards por perfil, temporalmente "sesión autenticada" hasta D-8.

## Requisitos funcionales (estado)

1. [x] Login único con enrutamiento por perfil: empresa → `/empresa/dashboard`, egresado → `/catalogo`; splash "Ingresando al portal…".
2. [x] Catálogo con filtros (categoría homologada con parámetros, búsqueda, paginación); agotados visibles "Sin cupos".
3. [x] Detalle de beneficio: hero por categoría, countdown, social proof, condiciones checklist, "Acerca de la empresa" con métricas reales.
4. [x] Solicitar beneficio: modal con datos complementarios, aceptación Ley 1581, documentos requeridos (PDF), radicado visible al crear.
5. [x] Mis solicitudes: estados, drawer con línea de tiempo (historial real) e hilo de mensajes; cancelar en estados en curso; deep-link `?radicado=`.
6. [x] Perfil del egresado: nombre real, código, programa/facultad (cadena C-2a con fallback local `programas-ud.ts` por dígitos [5:8] del código).
7. [x] Empresa — bandeja: filtros por estado y por beneficio (`?beneficio=`), responder (aprobar con comprobante opcional / rechazar con justificación / pedir info), comentar documentos.
8. [x] Empresa — mis beneficios: todos los estados, métricas, editar (form de publicar precargado) y retirar con confirmación.
9. [x] Selector multiempresa en el menú de usuario (visible con >1 empresa); bandeja y beneficios recargan solos al cambiar.
10. [x] Resumen de actividad (tarjetas por estado) y aviso del límite RN-010.

## Criterios de aceptación

1. `ng build` limpio; sin referencias a DEMO_MODE (eliminado).
2. Refrescar la página NO destruye la ruta ni la sesión (fixes de `clearUrl`/hash).
3. Las vistas nunca muestran "sin datos" antes de que el backend responda (skeletons + emisión `[]` mientras el JIT no resuelve, con tope de gracia).
4. Un id local ≤ 0 del JIT jamás se trata como éxito (ids quedan null y la UI muestra el aviso de perfil no habilitado).
5. Cambiar de empresa activa actualiza nombre visible, NIT, bandeja y beneficios sin recargar la página.

## Casos borde

- **Callback OAuth:** el servicio de auth se instancia en `AppComponent` para parsear el hash ANTES de que el router lo reescriba — quitar esa inyección pierde los tokens en silencio (documentado en el código; NO remover).
- **`prompt=login` no soportado** por el WSO2 UD; cambio de cuenta = logout del SSO.
- **JWT base64url (RFC 7515):** decodificar con la variante url-safe, no `atob` crudo.
- Egresado sin info complementaria 93 en terceros: `consultar_persona` viene plano → programa/facultad del fallback local o '—'.

## Restricciones institucionales (resumen de `specs/lineamientos/spec.md`)

Single-SPA + patrón `_mf`, Angular Material, validación bidireccional,
Ley 1581 (minimización en pantallas), TLS, borrado lógico en contratos.
