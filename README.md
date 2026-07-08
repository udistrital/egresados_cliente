# sga_cliente_beneficios_egresados_mf

Micro-frontend del submódulo **Beneficios para Egresados** del Sistema de Gestión
Académica (SGA) de la Universidad Distrital Francisco José de Caldas. Atiende dos
perfiles: **egresado** (catálogo, solicitudes, perfil académico) y **empresa aliada**
(publicación de beneficios, bandeja de solicitudes, mensajería).

Backend:
[`egresados_service`](https://github.com/udistrital/egresados_service)
(lógica) →
[`egresados_crud`](https://github.com/udistrital/egresados_crud)
(persistencia).

## Especificaciones técnicas

- **Angular 16.2** · Angular Material · Bootstrap 5 · RxJS
- Autenticación **OAuth2 Implicit Flow + OIDC sobre WSO2** (mismo esquema del
  `sga_cliente` institucional)
- Pendiente: integración single-spa con el shell del SGA (hoy arranca como app
  Angular normal)

## Arquitectura interna

```
core/
  services/    fachadas BeneficiosService / SolicitudesService / EmpresaService
               → reactivas a la sesión (recargan solas al resolver el JIT o
                 cambiar de empresa activa); los componentes solo dependen
                 de ellas (Observables)
  api/         beneficios-mid.service (espejo 1:1 de las rutas del MID),
               api.types.ts (DTOs), mappers.ts (DTO → modelos de UI),
               perfil-api.service (cadena C-2a: userRol → terceros_crud →
               consultar_persona → proyecto_academico)
  interceptors/ auth.interceptor (anexa Bearer; no fuerza re-login en 401)
  guards/      guards de sesión del routing
features/      catalogo · beneficio-detalle · solicitudes · dashboard ·
               empresa-registro · empresa-dashboard · empresa-beneficios · login
shared/        solicitud-modal · tipos OATI
```

- **`UsuarioSesionService`** centraliza el usuario del token y el perfil enriquecido
  (nombre, correo, código, programa, foto con fallback a iniciales). Tras el login
  dispara el JIT provisioning del perfil correspondiente (egresado o empresa) contra
  el MID y guarda los ids locales; para empresa mantiene la lista completa de
  empresas vinculadas (selector multiempresa, caso 1:N).

## Configuración (`src/environments/`)

| Campo | Descripción |
|---|---|
| `BENEFICIOS_MID` | URL del MID (`http://localhost:8081/v1` en local) |
| `TOKEN.*` (`AUTORIZATION_URL`, `CLIENTE_ID`, `REDIRECT_URL`, `AUTENTICACION_MID`, ...) | OAuth2/OIDC WSO2 — el `CLIENTE_ID` propio del módulo está pendiente de la OAS (no reutilizar el del SGA) |
| `ROLES_EGRESADO` / `ROLES_EMPRESA` | nombres de rol WSO2 — pendientes de definición con OATI; mientras tanto los guards solo exigen sesión autenticada |
| `TERCEROS_SERVICE`, `SGA_MID`, `PROYECTO_ACADEMICO_SERVICE` | servicios institucionales usados por el perfil del egresado (C-2a) |

`environment.prod.ts` se aplica con `fileReplacements` (`ng build --configuration production`).

## Ejecución

```bash
npm install
npm start          # http://localhost:4200
```

Requiere el CRUD (8080) y el MID (8081) corriendo; el login redirige a WSO2
(credenciales institucionales).

## Documentación (SDD)

- `specs/cliente-ui/` — spec y tareas del micro-frontend (arquitectura, vistas, sesión).
- `specs/lineamientos/` — restricciones institucionales OATI aplicables al front.
- `docs/referencia-autenticacion-wso2.md` — patrón de autenticación del ecosistema SGA.
- Las especificaciones **transversales** (visión general, autenticación, parámetros)
  viven en `specs/system/` del repo [`egresados_service`](https://github.com/udistrital/egresados_service).

## Contexto

Desarrollado en el marco de la pasantía de Ingeniería de Sistemas (2026) para la
Oficina Asesora de Sistemas (OAS) / OATI, siguiendo los lineamientos de
micro-frontends del SGA (Single-SPA, Angular, autenticación delegada al Core MF).
