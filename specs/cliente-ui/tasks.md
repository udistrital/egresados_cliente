# Tasks — Micro-frontend

> Estado al 2026-07-08.

## Completadas (hitos)

1. [x] Capa de integración (cliente HTTP + DTOs + mappers + fachadas). — 2026-06-10
2. [x] Login OIDC probado contra WSO2 real. — 2026-06-10
3. [x] Modo demo eliminado; integración completa con MID real. — 2026-07-02
4. [x] Login único con enrutamiento por perfil + guards + splash. — 2026-07-02
5. [x] JIT cableado (egresado y empresa) con sesión reactiva. — 2026-07-02
6. [x] Portal de empresa: bandeja, responder, mis beneficios, publicar/editar/retirar. — 2026-07-02/07
7. [x] Selector multiempresa persistente. — 2026-07-07
8. [x] Fallback local de carrera/facultad (`programas-ud.ts`). — 2026-07-07
9. [x] NIT en sesión y perfil de empresa (merge de Johan corregido: NIT por empresa vinculada). — 2026-07-08

## Pendientes

1. [ ] **Integración Single-SPA** con el shell del SGA (root + core): hoy es bootstrap Angular normal. Requiere también los valores de producción (D-6: CLIENTE_ID, REDIRECT_URL, ruta del MID en el gateway).
2. [ ] Form de publicar: separar descripción/condiciones (hoy "resumen" alimenta ambos campos; el MID exige ambos por RN-008b).
3. [ ] Edición de documentos requeridos de un beneficio (hoy solo se definen al publicar).
4. [ ] Restaurar el chequeo de rol real en los guards cuando OATI confirme los nombres (D-8; `environment.ROLES_EGRESADO/ROLES_EMPRESA`).
5. [ ] Foto del egresado vía Nuxeo (cadena documentada; fallback a iniciales ya funciona).
6. [ ] Skeleton para las stats cards del dashboard.
7. [ ] CTA de registro del login apunta a `/registro` placeholder — falta la URL de la página institucional de auto-registro (preguntar a OATI).
8. [ ] Pruebas automatizadas de mappers (`mapBeneficio`, `mapSolicitud`, `categoriaColor` — puros, sin TestBed).
