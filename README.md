# egresados_cliente

Micro-frontend del submódulo **Beneficios para Egresados** del Sistema de Gestión
Académica (SGA) de la Universidad Distrital Francisco José de Caldas. Atiende dos
perfiles: **egresado** (catálogo, solicitudes, perfil académico) y **empresa aliada**
(publicación de beneficios, bandeja de solicitudes, mensajería).

Backend:
[`egresados_service`](https://github.com/udistrital/egresados_service)
(lógica) →
[`egresados_crud`](https://github.com/udistrital/egresados_crud)
(persistencia).

## Especificaciones Técnicas

### Tecnologías Implementadas y Versiones

- [Angular](https://angular.io/docs) 16.2.0
  - Incluye Animations, CDK, Common, Compiler, Core, Forms, Material,
    Platform-Browser, Platform-Browser-Dynamic, Router
- [Angular Material](https://material.angular.io/) 16.2.14
- [Angular CDK](https://material.angular.io/cdk/categories) 16.2.14
- [Bootstrap](https://getbootstrap.com/) 5.3.2
- [RxJS](https://rxjs.dev/guide/overview) ~7.8.0
- [SweetAlert2](https://sweetalert2.github.io/) 11.26.x
- [ts-md5](https://github.com/cotag/ts-md5) 2.0.1
- [tslib](https://github.com/Microsoft/tslib) 2.3.0
- [Zone.js](https://github.com/angular/angular/tree/master/packages/zone.js) ~0.13.0
- Autenticación **OAuth2 Implicit Flow + OIDC sobre WSO2** (mismo esquema del
  `sga_cliente` institucional)
- Pruebas unitarias: Karma + Jasmine (scaffold estándar de Angular CLI)

> Pendiente: integración single-spa con el shell del SGA (`sga_cliente_root` +
> `core_mf_cliente`) — hoy arranca como app Angular normal (`ng serve`), a
> diferencia de otros micro-frontends institucionales que ya corren bajo Single-SPA.

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

### Variables de Entorno

A diferencia de los backends (que leen env vars en runtime), Angular **compila** la
configuración: `src/environments/environment.ts` (dev, usado por `ng serve` y
`npm run build:test`) y `environment.prod.ts` (aplicado por `fileReplacements` en
`ng build --configuration production`, o sea `npm run build:prod`).

```typescript
export const environment = {
  production: false,

  TOKEN: {
    AUTORIZATION_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize',
    CLIENTE_ID: '',           // ← lo entrega OATI (D-6); NO reutilizar el del SGA en prod
    RESPONSE_TYPE: 'id_token token',
    SCOPE: 'openid email role documento',
    REDIRECT_URL: 'http://localhost:4200/',  // debe coincidir con lo registrado en WSO2
    SIGN_OUT_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oidc/logout',
    SIGN_OUT_REDIRECT_URL: 'http://localhost:4200/',
    SIGN_OUT_APPEND_TOKEN: 'true',
    AUTENTICACION_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  },

  API_GET_IDENTIFICATION: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  DATOS_IDENTIFICACION_TERCERO_ENDPOINT: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1/datos_identificacion',
  TERCEROS_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1',

  // Perfil académico del egresado (C-2a)
  SGA_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/sga_mid/v1',
  PROYECTO_ACADEMICO_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/proyecto_academico_crud/v1',

  // MID de Beneficios Egresados: :8081 en local, tras el gateway /apioas/ en despliegue
  BENEFICIOS_MID: 'http://localhost:8081/v1',

  // Roles de WSO2 que habilitan cada vista (pendientes de confirmar con OATI, D-5/D-7)
  ROLES_EGRESADO: ['egresado', 'EGRESADO'],
  ROLES_EMPRESA: ['empresa', 'EMPRESA'],
};
```

| Campo | Descripción |
|---|---|
| `BENEFICIOS_MID` | URL del MID (`http://localhost:8081/v1` en local) |
| `TOKEN.*` (`AUTORIZATION_URL`, `CLIENTE_ID`, `REDIRECT_URL`, `AUTENTICACION_MID`, ...) | OAuth2/OIDC WSO2 — el `CLIENTE_ID` propio del módulo está pendiente de la OAS (no reutilizar el del SGA en prod) |
| `ROLES_EGRESADO` / `ROLES_EMPRESA` | nombres de rol WSO2 — pendientes de definición con OATI; mientras tanto los guards solo exigen sesión autenticada |
| `TERCEROS_SERVICE`, `SGA_MID`, `PROYECTO_ACADEMICO_SERVICE` | servicios institucionales usados por el perfil del egresado (C-2a) |

`environment.prod.ts` **no** trae `CLIENTE_ID`/`REDIRECT_URL` embebidos (quedan vacíos
a propósito): los entrega OATI al desplegar cada ambiente.

## Ejecución del Proyecto

```bash
# 1. Clonar el repositorio
git clone -b develop https://github.com/udistrital/egresados_cliente.git

# 2. Moverse a la carpeta del repositorio
cd egresados_cliente

# 3. Instalar las dependencias
npm install

# 4. Iniciar el proyecto
npm start          # http://localhost:4200
```

Requiere el CRUD (`:8080`) y el MID (`:8081`) corriendo; el login redirige a WSO2
(credenciales institucionales). Este proyecto **no** depende hoy de un Root/Core
Single-SPA para arrancar (ver nota de "Pendiente" arriba).

## Ejecución Dockerfile
```bash
# No aplica: el CI publica el `dist/` compilado directo a S3 (ver .drone.yml),
# no se construye una imagen Docker para este repo.
```

## Ejecución docker-compose
```bash
# No aplica.
```

## Ejecución Pruebas

Pruebas unitarias con **Karma + Jasmine** (scaffold estándar de Angular CLI; no Jest).

```bash
npm test        # ng test — abre Chrome y corre las specs *.spec.ts
```

No hay un script de lint configurado todavía en `package.json`.

## Estado CI

| Develop | Master | Sonar |
| -- | -- | -- |
| [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/egresados_cliente/status.svg?ref=refs/heads/develop)](https://hubci.portaloas.udistrital.edu.co/udistrital/egresados_cliente) | [![Build Status](https://hubci.portaloas.udistrital.edu.co/api/badges/udistrital/egresados_cliente/status.svg?ref=refs/heads/master)](https://hubci.portaloas.udistrital.edu.co/udistrital/egresados_cliente) | [![Quality Gate Status](https://sonarqube.portaloas.udistrital.edu.co/api/project_badges/measure?project=egresados_cliente&metric=alert_status)](https://sonar.portaloas.udistrital.edu.co/dashboard?id=egresados_cliente) |

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

## Licencia

[This file is part of egresados_cliente.](LICENSE)

egresados_cliente is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

egresados_cliente is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
egresados_cliente. If not, see https://www.gnu.org/licenses/.
