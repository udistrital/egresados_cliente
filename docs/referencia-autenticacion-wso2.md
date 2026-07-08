# Referencia — Autenticación WSO2/OIDC del ecosistema SGA

> **Estado del documento (2026-07-08):** referencia de OTRO proyecto (SISE
> Cliente), antes archivo `AUTH_SPEC.md`. Describe el patrón institucional del
> que se derivó nuestra implementación; la spec vigente de NUESTRO módulo es
> `specs/system/autenticacion/spec.md` (repo `sga_mid_beneficios_egresados`).
> La sección 13 duplica código fuente de ese repo (consérvese solo como consulta).

> **Proyecto:** SISE Cliente (Frontend Angular/Ionic)
> **Protocolo:** OpenID Connect (OIDC) — Implicit Grant Flow
> **Proveedor OAuth:** WSO2 Identity Server (`autenticacion.portaloas.udistrital.edu.co`)
> **Última revisión:** 2026-05-29

---

## Tabla de contenido

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Stack y dependencias](#2-stack-y-dependencias)
3. [Modelos y estructuras de datos](#3-modelos-y-estructuras-de-datos)
4. [Variables de entorno y configuración](#4-variables-de-entorno-y-configuración)
5. [Flujos de autenticación](#5-flujos-de-autenticación)
6. [Endpoints externos](#6-endpoints-externos)
7. [Servicios involucrados](#7-servicios-involucrados)
8. [Guards y protección de rutas](#8-guards-y-protección-de-rutas)
9. [Manejo de tokens](#9-manejo-de-tokens)
10. [Estado de sesión reactivo](#10-estado-de-sesión-reactivo)
11. [Notas de seguridad](#11-notas-de-seguridad)
12. [Guía de implementación en proyecto nuevo](#12-guía-de-implementación-en-proyecto-nuevo)
13. [Código fuente completo de archivos de auth](#13-código-fuente-completo-de-archivos-de-auth)

---

## 1. Resumen ejecutivo

El sistema **no gestiona credenciales propias** (usuario/contraseña). Toda la autenticación se delega al servidor de autorización WSO2 mediante el flujo implícito de OAuth2/OIDC. El cliente:

1. Redirige al usuario al proveedor para que se autentique.
2. Recibe los tokens en el hash de la URL al regresar.
3. Valida la identidad consultando el microservicio `autenticacion_mid`.
4. Almacena los tokens en `localStorage` y gestiona la expiración de forma local.

No existe módulo de registro (signup), recuperación de contraseña ni refresh de token. Cuando el token expira, la sesión termina y el usuario debe volver a iniciar sesión.

---

## 2. Stack y dependencias

| Tecnología | Versión | Rol en auth |
|---|---|---|
| Angular | 14.0.3 | Framework base |
| Ionic | 6.1.7 | UI mobile-first |
| RxJS | 6.6.7 | BehaviorSubject para estado de sesión |
| `ts-md5` | 1.2.11 | Genera `state` y `nonce` (MD5 del timestamp) |
| `sweetalert2` | ^11 | Alerta de expiración de sesión (5 min antes) |
| `oidc-auth` | 0.6.0 | **Instalado pero NO utilizado** |

> No se usa ninguna librería de decodificación JWT (`jwt-decode`). El payload del `id_token` se decodifica manualmente con `atob(token.split('.')[1])`.

**Archivos clave:**

```
src/app/@core/utils/implicit_autentication.service.ts   ← Servicio principal de auth
src/app/@core/_guards/auth.guard.ts                     ← Guard de rutas
src/app/@core/services/infopersonal.service.ts          ← Datos del usuario
src/app/@core/services/funcs.service.ts                 ← Headers HTTP con Bearer token
src/app/@core/managers/requestManager.ts                ← HTTP helper genérico
src/app/pages/login/login.component.ts                  ← Componente de login
src/environments/environment.ts                         ← Config dev/test
src/environments/environment.prod.ts                    ← Config producción
```

---

## 3. Modelos y estructuras de datos

### 3.1 Payload del `id_token` (JWT — decodificado)

Contenido estándar OIDC retornado por el proveedor WSO2:

```typescript
interface JwtPayload {
  email: string;          // Correo institucional del usuario
  iss: string;            // Emisor: https://autenticacion.portaloas.udistrital.edu.co
  aud: string;            // Audience: client_id de la app
  sub: string;            // Subject: identificador único del usuario en WSO2
  exp: number;            // Unix timestamp de expiración
  iat: number;            // Unix timestamp de emisión
  role?: string[];        // Roles asignados en WSO2 (puede ser vacío)
  nonce: string;          // Nonce enviado en la solicitud
}
```

### 3.2 Respuesta de `autenticacion_mid` (userService)

```typescript
interface UserServiceResponse {
  email: string;              // Correo del usuario
  documento: string;          // Número de documento de identidad
  documento_compuesto: string; // Documento con dígito de verificación (si aplica)
  role: string[];             // Roles del usuario en el sistema institucional
}
```

### 3.3 Objeto de usuario almacenado en localStorage (`user`)

Se guarda como `btoa(JSON.stringify(...))`:

```typescript
interface StoredUser {
  user: JwtPayload;                 // Payload del JWT id_token
  userService: UserServiceResponse; // Respuesta del microservicio mid
}
```

### 3.4 Tercero (entidad principal del usuario)

**Archivo:** `src/app/@core/data/models/tercero.ts`

```typescript
class Tercero {
  Id: string;
  Activo: boolean;
  FechaCreacion: string;
  FechaModificacion: string;
  FechaNacimiento: string;
  LugarOrigen: string;
  NombreCompleto: string;
  PrimerNombre: string;
  SegundoNombre: string;
  PrimerApellido: string;
  SegundoApellido: string;
  TipoContribuyenteId: string;
  UsuarioWSO2: string;
  Numero: string;        // Número de documento
  FechaExpedicion: string;
  TipoDocumentoId: string;
}
```

### 3.5 DatosIdentificacionTercero

**Archivo:** `src/app/@core/data/models/datos_identificacion_tercero.ts`

```typescript
class DatosIdentificacionTercero {
  Id?: number;
  TipoDocumentoId?: {
    Id: number;
    Nombre: string;
    Descripcion: string;
    CodigoAbreviacion: string;
    Activo: boolean;
  };
  TerceroId?: Tercero;         // Objeto Tercero anidado
  Numero?: string;             // Número de documento
  DigitoVerificacion?: number;
  CiudadExpedicion?: number;
  FechaExpedicion?: string;
  Activo?: boolean;
  DocumentoSoporte?: number;
  FechaCreacion?: string;
  FechaModificacion?: string;
}
```

### 3.6 Documento (interfaz auxiliar)

**Archivo:** `src/app/@core/data/models/document.ts`

```typescript
interface Documento {
  documento: string;
  documento_compuesto: string;
}
```

---

## 4. Variables de entorno y configuración

### 4.1 Bloque `TOKEN` (config OAuth)

| Variable | Dev/Test | Producción |
|---|---|---|
| `AUTORIZATION_URL` | `https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize` | igual |
| `CLIENTE_ID` | `[CLIENTE_ID_DEV]` | `[CLIENTE_ID_PROD]` (propio de cada aplicación) |
| `RESPONSE_TYPE` | `id_token token` | igual |
| `SCOPE` | `openid email` | igual |
| `REDIRECT_URL` | `http://localhost:4200/` | `https://sisecliente.portaloas.udistrital.edu.co` |
| `SIGN_OUT_URL` | `https://autenticacion.portaloas.udistrital.edu.co/oidc/logout` | igual |
| `SIGN_OUT_REDIRECT_URL` | `http://localhost:4200/` | `https://sisecliente.portaloas.udistrital.edu.co` |
| `SIGN_OUT_APPEND_TOKEN` | `'true'` | igual |
| `AUTENTICACION_MID` | `https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol` | igual |

### 4.2 Endpoints de datos de usuario

| Variable | URL |
|---|---|
| `API_GET_IDENTIFICATION` | `https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol` |
| `DATOS_IDENTIFICACION_TERCERO_ENDPOINT` | `https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1/datos_identificacion` |
| `TERCEROS_SERVICE` | `https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1` |

### 4.3 Otros servicios referenciados en environment

| Variable | Base URL | Propósito |
|---|---|---|
| `WSO2_SERVICE` | `https://autenticacion.portaloas.udistrital.edu.co/apioas/` | Gateway general WSO2 |
| `OIKOS_SERVICE` | `.../apioas/oikos_crud_api/v2/` | Gestión de espacios físicos |
| `CONFIGURACION_SERVICE` | `.../apioas/configuracion_crud_api/v1/` | Configuración general |
| `API_ENDPOINT_UBICACIONES` | `.../apioas/ubicaciones_crud/v2/` | Ubicaciones geográficas |
| `EVENTOS_ENDPOINT` | `.../apioas/sesiones_crud/v2` | Gestión de eventos/sesiones |
| `NOTIFICATIONS_SERVICE` | `.../apioas/notificacion_mid` | Notificaciones |
| `CORE_SERVICE` | `http://pruebasapi.intranetoas.udistrital.edu.co:8092/v1/` | Servicios core institucionales |
| `NUXEO.PATH` | `https://documental.udistrital.edu.co/nuxeo/` | Gestión documental |

---

## 5. Flujos de autenticación

### 5.1 Flujo de Login (OIDC Implicit Flow)

```
Usuario             LoginComponent         ImplicitAutenticationService    WSO2 / autenticacion_mid
  │                      │                            │                              │
  │── click "Login" ────>│                            │                              │
  │                      │── login(false) ──────────>│                              │
  │                      │                            │── getAuthorizationUrl() ─>  │
  │                      │                            │                              │
  │<─── redirect ────────────────────────────────────────────────────────────────── │
  │                                                                      (usuario se autentica en WSO2)
  │<─── redirect a REDIRECT_URL#id_token=...&access_token=...&expires_in=...&state=...
  │                      │                            │
  │                      │               init() parsea el hash URL
  │                      │                            │
  │                      │               localStorage.setItem('access_token', ...)
  │                      │               localStorage.setItem('id_token', ...)
  │                      │               localStorage.setItem('expires_in', ...)
  │                      │               localStorage.setItem('state', ...)
  │                      │                            │
  │                      │               decodifica JWT payload (atob)
  │                      │                            │
  │                      │               updateAuth(payload) ────────────────────>  POST /token/userRol
  │                      │                            │<── { email, documento, role } ─────────────────
  │                      │                            │
  │                      │               localStorage.setItem('user', btoa(JSON))
  │                      │               userSubject.next({ user, userService })
  │                      │               setExpiresAt() → localStorage 'expires_at'
  │                      │               autologout(expires) → timers programados
  │                      │               clearUrl() → limpia hash de la URL
  │                      │                            │
  │<── navigate('/pages/home') ──────────────────────│
```

**URL de autorización construida:**
```
GET https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize
  ?client_id=<CLIENTE_ID>
  &redirect_uri=<REDIRECT_URL>
  &response_type=id_token%20token
  &scope=openid%20email
  &state_url=<hash_actual>
  &nonce=<md5_aleatorio>
  &state=<md5_aleatorio>
```

### 5.2 Flujo de Logout

```
Usuario           App / Header          ImplicitAutenticationService         WSO2
  │                   │                          │                             │
  │── click logout ──>│                          │                             │
  │                   │── logout(action) ───────>│                             │
  │                   │                          │  construye logoutUrl        │
  │                   │                          │  clearStorage()             │
  │                   │                          │  logoutSubject.next(action) │
  │                   │<─────────────────────────│                             │
  │<── redirect ──────────────────────────────────────────────────────────────│
  │                                                   (WSO2 invalida sesión)
  │<── redirect a SIGN_OUT_REDIRECT_URL ──────────────────────────────────────│
```

**URL de logout construida:**
```
GET https://autenticacion.portaloas.udistrital.edu.co/oidc/logout
  ?id_token_hint=<id_token>
  &post_logout_redirect_uri=<SIGN_OUT_REDIRECT_URL>
  &state=<state_del_localStorage>
```

### 5.3 Inicialización en arranque (`init()`)

Al instanciarse `ImplicitAutenticationService` (singleton root), el constructor llama a `init()`:

```
¿id_token en localStorage?
     │
    NO ──> parsea location.hash
              │
              ¿params['id_token'] presente?
                   │
                  SI ──> guarda tokens → updateAuth() → setExpiresAt() → autologout()
                  │
                  NO ──> clearStorage()
     │
    SI ──> decodifica id_token existente → updateAuth() → setExpiresAt() → autologout()
```

Además, registra un listener en `document.visibilitychange`: cuando la pestaña vuelve a ser visible, recalcula la expiración y reprograma `autologout()`.

### 5.4 Auto-logout por expiración

```typescript
// Lógica en autologout(expires)
const expiresIn = expires.getTime() - Date.now();

if (expiresIn < 1000ms) {
  clearStorage();
  logoutSubject.next('logout-auto-only-localstorage');
  location.reload();
} else {
  // Alerta 5 minutos antes
  delay(expiresIn - 300000ms) → SweetAlert2 toast informativo

  // Logout al vencer
  delay(expiresIn - 1000ms)   → logout('logout-auto')
}
```

### 5.5 Signup / Registro

**No implementado en el cliente.** La creación de cuentas se gestiona íntegramente en WSO2. Esta app solo consume usuarios ya existentes en el directorio institucional.

### 5.6 Refresh de token

**No implementado.** El flujo implícito de OAuth2 no soporta refresh tokens. Cuando el token expira, el usuario debe iniciar sesión nuevamente.

---

## 6. Endpoints externos

### 6.1 Autenticación (WSO2)

| # | Método | URL | Descripción |
|---|---|---|---|
| 1 | `GET` (redirect) | `https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize` | Inicia el flujo OIDC. El browser redirige aquí. |
| 2 | `GET` (redirect) | `https://autenticacion.portaloas.udistrital.edu.co/oidc/logout` | Cierra la sesión en el proveedor. |

**Request #1 — Authorization:**
```
Query params:
  client_id       → CLIENTE_ID del entorno
  redirect_uri    → REDIRECT_URL del entorno
  response_type   → "id_token token"
  scope           → "openid email"
  state_url       → hash de la URL actual (para restaurar estado)
  nonce           → MD5(timestamp + random)
  state           → MD5(timestamp + random)

Response (hash URL al regresar):
  #id_token=<JWT>
  &access_token=<opaque_token>
  &expires_in=<segundos>
  &state=<estado_enviado>
```

### 6.2 Microservicio `autenticacion_mid`

| # | Método | URL | Auth | Descripción |
|---|---|---|---|---|
| 3 | `POST` | `/apioas/autenticacion_mid/v1/token/userRol` | Bearer token | Obtiene roles y documento del usuario a partir del email |

**Request #3:**
```json
// Headers
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json

// Body
{ "user": "correo@udistrital.edu.co" }
```

**Response #3:**
```json
{
  "email": "correo@udistrital.edu.co",
  "documento": "12345678",
  "documento_compuesto": "12345678-9",
  "role": ["Internal/selfsignup", "Internal/everyone"]
}
```

### 6.3 Servicio `terceros_crud`

| # | Método | URL | Auth | Descripción |
|---|---|---|---|---|
| 4 | `GET` | `/apioas/terceros_crud/v1/datos_identificacion?query=Numero:{doc}` | Bearer token | Datos de identificación completos del tercero |
| 5 | `GET` | `/apioas/terceros_crud/v1/tercero?query=Id:{terceroId}` | Bearer token | Perfil completo del tercero |
| 6 | `GET` | `/apioas/terceros_crud/v1/info_complementaria_tercero?query=TerceroId.Id:{id},...` | Bearer token | Metadatos del usuario (foto, género, intereses, etc.) |
| 7 | `POST` | `/apioas/terceros_crud/v1/tercero` | Bearer token | Crear tercero |
| 8 | `PUT` | `/apioas/terceros_crud/v1/<recurso>` | Bearer token | Actualizar datos del tercero |

**Response #4 — DatosIdentificacionTercero[]:**
```json
[
  {
    "Id": 1,
    "TipoDocumentoId": { "Id": 1, "Nombre": "Cédula de Ciudadanía", "CodigoAbreviacion": "CC" },
    "TerceroId": {
      "Id": "42",
      "NombreCompleto": "Juan Pérez",
      "UsuarioWSO2": "jperez",
      ...
    },
    "Numero": "12345678",
    "Activo": true
  }
]
```

---

## 7. Servicios involucrados

### 7.1 `ImplicitAutenticationService`

**Archivo:** `src/app/@core/utils/implicit_autentication.service.ts`
**Alcance:** `providedIn: 'root'` (singleton global)

| Método | Descripción |
|---|---|
| `init(entorno)` | Arranca el ciclo de auth: parsea hash, guarda tokens, llama a `updateAuth()` |
| `login(flag: boolean): boolean` | Verifica si hay token válido; si no, redirige al proveedor |
| `getAuthorizationUrl(): string` | Construye y ejecuta la redirección a WSO2 |
| `updateAuth(payload)` | Llama a `autenticacion_mid`, guarda user en localStorage y emite al BehaviorSubject |
| `logout(action: string): void` | Limpia storage y redirige a WSO2 logout |
| `getPayload(): any` | Decodifica el JWT `id_token` y retorna el payload |
| `getRole(): Promise<string[]>` | Retorna los roles combinados (JWT + userService), filtrando paths |
| `getMail(): Promise<string>` | Retorna el email del `userService` |
| `getDocument(): Promise<string>` | Retorna el número de documento del `userService` |
| `setExpiresAt(): Date` | Calcula y persiste la fecha de expiración en localStorage |
| `expired(): boolean` | Compara `expires_at` con la fecha actual |
| `autologout(expires): void` | Programa timers para alerta (5 min) y logout automático |
| `logoutValid(): boolean` | Verifica que el `state` del callback de logout coincida |
| `generateState(): string` | Genera hash MD5 aleatorio para `state`/`nonce` |
| `clearUrl(): void` | Elimina el hash de la URL con `history.replaceState` |
| `clearStorage(): void` | Limpia `localStorage` y `sessionStorage`, setea `isLogin = false` |
| `live(): boolean` | Retorna `isLogin` (estado en memoria) |

### 7.2 `AuthGuard`

**Archivo:** `src/app/@core/_guards/auth.guard.ts`
**Alcance:** `providedIn: 'root'`

Implementa `CanActivate` y `CanActivateChild`. En cada navegación a una ruta protegida:

1. Lee `id_token` de localStorage y decodifica el payload.
2. Llama a `InfoPersonalService.getDocumentIdByEmail()` para obtener los roles del `autenticacion_mid`.
3. Compara los roles del usuario con los roles declarados en `route.data.roles`.
4. Si hay coincidencia → permite el acceso.
5. Si no hay coincidencia → `router.navigate(['/'])` y retorna `false`.

> **Nota:** El guard hace una llamada HTTP en cada activación de ruta; no cachea el resultado entre navegaciones.

### 7.3 `InfoPersonalService`

**Archivo:** `src/app/@core/services/infopersonal.service.ts`
**Alcance:** `providedIn: 'root'`

Servicio que abstrae las llamadas HTTP al backend de identidad. Todos sus métodos inyectan el `Bearer token` mediante `FuncsService.openIDDefaultOptions()`.

| Método | Descripción |
|---|---|
| `traerUserInfo(endpoint, data)` | `POST` genérico con manejo de error 404/400 |
| `getDocumentIdByEmail(endpoint, data)` | `POST` a `autenticacion_mid` con `{ user: email }` |
| `getInformationByDocument(endpoint, documento)` | `GET` a `terceros_crud` filtrando por número de documento |
| `getInfoComplementariaTercero(endpoint, params)` | `GET` a `info_complementaria_tercero` (foto, metadatos) |
| `getDocumentTypes(endpoint)` | `GET` para tipos de documento |
| `updateInformation(endpoint, data)` | `PUT` para actualizar datos del tercero |
| `createTercero(endpoint, data)` | `POST` para crear un nuevo tercero |
| `getTerceroId()` | Helper async: obtiene el `Id` numérico del tercero a partir del email en el JWT |

### 7.4 `FuncsService`

**Archivo:** `src/app/@core/services/funcs.service.ts`
**Alcance:** `providedIn: 'root'`

Proveedor de headers HTTP autenticados. Método clave para auth:

```typescript
openIDDefaultOptions() {
  return {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'authorization': 'Bearer ' + window.localStorage.getItem('access_token'),
    }),
  };
}
```

Este método es llamado en **cada** petición HTTP que requiere autenticación. No hay interceptor HTTP; los headers se inyectan manualmente en cada llamada.

También contiene `imageUpload()` para subida de imágenes a Cloudinary (no relacionado con auth).

### 7.5 `RequestManager`

**Archivo:** `src/app/@core/managers/requestManager.ts`
**Alcance:** `providedIn: 'root'`

Helper HTTP genérico para servicios que usan el formato de respuesta `{ Body: ..., Type: ... }` (patrón OAS). Lee el `access_token` de `localStorage` en cada llamada `get()`:

```typescript
headers: new HttpHeaders({
  'Accept': 'application/json',
  'authorization': `Bearer ${window.localStorage.getItem('access_token')}`,
}),
```

> Los métodos `post`, `put` y `delete` están comentados en el código actual.

### 7.6 `LoginComponent`

**Archivo:** `src/app/pages/login/login.component.ts`

Componente de entrada pública. No contiene formulario de credenciales. Solo tiene un botón que llama a `ImplicitAutenticationService.login(false)`. En `ngOnInit()` comprueba si ya hay `access_token` en localStorage y redirige directamente a `/pages/home`.

---

## 8. Guards y protección de rutas

### 8.1 Mapa de rutas

| Ruta | Guard | Roles requeridos |
|---|---|---|
| `/pages/login` | Ninguno (pública) | — |
| `/pages/home` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/creacioneventos` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/info-academica` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/info-empresarial` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/info-students` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/info-laboral` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/info-personal` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/incripcionaeventos` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/gestion-empresarial` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/localizacion` | `AuthGuard` | `Internal/selfsignup`, `Internal/everyone` |
| `/pages/coworking` | Ninguno (pública) | `Internal/everyone` (declarado pero sin guard) |
| `/pages/coworking/sala-bacata` | Ninguno (pública) | `Internal/everyone` (sin guard) |
| `/pages/coworking/sala-monserrate` | Ninguno (pública) | `Internal/everyone` (sin guard) |
| `/pages/coworking/sala-tequendama` | Ninguno (pública) | `Internal/everyone` (sin guard) |

> Las rutas de coworking declaran `data.roles` pero **no tienen `canActivate: [AuthGuard]`**, por lo que son accesibles sin autenticación.

### 8.2 Roles definidos

| Rol | Descripción |
|---|---|
| `Internal/selfsignup` | Usuario que completó el auto-registro en el portal |
| `Internal/everyone` | Todos los usuarios autenticados en WSO2 |

---

## 9. Manejo de tokens

### 9.1 Almacenamiento

Todos los tokens se guardan en **`window.localStorage`** (persistente entre sesiones del browser).

| Clave localStorage | Tipo | Contenido | Usado por |
|---|---|---|---|
| `id_token` | String (JWT) | `header.payload.signature` en Base64 | `getPayload()`, URL de logout |
| `access_token` | String opaco | Bearer token OAuth2 | Headers `Authorization` en todas las APIs |
| `expires_in` | String (número) | Segundos de validez desde la emisión | `setExpiresAt()` |
| `expires_at` | String (UTC date) | Timestamp de expiración calculado | `autologout()`, `expired()` |
| `state` | String (MD5 hex) | Estado OAuth2 para validar callbacks | Verificación en logout |
| `user` | String (Base64 JSON) | `btoa(JSON.stringify({ user: payload, userService: res }))` | `user$` observable, componentes |

### 9.2 Ciclo de vida del token

```
Login exitoso
  → expires_in guardado (ej: 3600 seg)
  → expires_at = now + expires_in
  → autologout() programa timers

5 min antes de expirar:
  → SweetAlert2 toast: "Su sesión se cerrará en 5 minutos"

Al expirar (−1 seg):
  → logout('logout-auto')
  → clearStorage()
  → redirect a WSO2 logout
  → reload página

Si el usuario vuelve a la pestaña (visibilitychange):
  → recalcula expires_at
  → reprograma autologout()
```

### 9.3 Decodificación del JWT (sin librería)

```typescript
// En implicit_autentication.service.ts — getPayload()
const idToken = window.localStorage.getItem('id_token').split('.');
const payload = JSON.parse(atob(idToken[1]));
```

No se verifica la firma del JWT en el cliente. La confianza se establece por el hecho de que el token proviene directamente del proveedor WSO2 a través de HTTPS.

### 9.4 Generación de state/nonce

```typescript
// generateState()
const text = ((Date.now() + Math.random()) * Math.random()).toString().replace('.', '');
return Md5.hashStr(text); // ts-md5
```

---

## 10. Estado de sesión reactivo

El servicio expone tres observables via `BehaviorSubject`:

| Observable | Subject privado | Emite | Subscriptores |
|---|---|---|---|
| `user$` | `userSubject` | `{ user: JwtPayload, userService: UserServiceResponse }` | `HomeComponent`, `AuthGuard` (indirecto) |
| `menu$` | `menuSubject` | `{}` (nunca poblado actualmente) | — |
| `logout$` | `logoutSubject` | String de acción: `'logout-auto'`, `'logout-auto-only-localstorage'`, etc. | Componentes que reaccionan al logout |

**Ejemplo de uso en `HomeComponent`:**
```typescript
this.autenticacion.user$.subscribe((data: any) => {
  const { user, userService } = data;
  this.username = user?.email ?? userService?.email ?? '';
});
```

---

## 11. Notas de seguridad

| Riesgo | Estado | Observación |
|---|---|---|
| Tokens en `localStorage` | Activo | Expuesto a XSS. HttpOnly cookies sería más seguro. |
| Sin `HttpInterceptor` | Activo | El `access_token` se lee de localStorage en cada llamada; si el token se rota no se actualiza automáticamente. |
| Sin refresh token | Por diseño | Implicit Flow no soporta refresh tokens. Al expirar hay re-login. |
| Firma JWT no verificada | Activo | El cliente confía en la integridad del token sin validar la firma. |
| `oidc-auth` instalado pero no usado | Activo | Dependencia muerta; puede generar alertas de seguridad en auditorías. |
| Coworking accesible sin guard | Activo | Las rutas de coworking tienen `data.roles` pero no `canActivate`; cualquier usuario puede acceder. |
| `console.log` de access_token | Activo | `login.component.ts:24` imprime el token en la consola del browser. |
| Guard hace HTTP en cada activación | Activo | Sin caché; cada navegación a ruta protegida dispara `POST /token/userRol`. |

---

## 12. Guía de implementación en proyecto nuevo

Esta sección contiene todo lo necesario para montar el sistema de auth desde cero en un repo Angular diferente. Sigue los pasos en orden.

---

### Paso 1 — Instalar dependencias

```bash
npm install ts-md5 sweetalert2
```

> No instales `oidc-auth` ni `jwt-decode`; no se usan en esta implementación.

---

### Paso 2 — Configurar `environment.ts` (CRÍTICO)

En el nuevo repo, el bloque mínimo requerido en `environment.ts` es:

```typescript
export const environment = {
  production: false,
  TOKEN: {
    AUTORIZATION_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize',
    CLIENTE_ID: '<TU_CLIENT_ID_DEV>',        // Registrar app en WSO2 para obtener este ID
    RESPONSE_TYPE: 'id_token token',
    SCOPE: 'openid email',
    REDIRECT_URL: 'http://localhost:4200/',   // Debe coincidir exactamente con lo registrado en WSO2
    SIGN_OUT_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oidc/logout',
    SIGN_OUT_REDIRECT_URL: 'http://localhost:4200/',
    SIGN_OUT_APPEND_TOKEN: 'true',
    AUTENTICACION_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  },
  API_GET_IDENTIFICATION: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  DATOS_IDENTIFICACION_TERCERO_ENDPOINT: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1/datos_identificacion',
  TERCEROS_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1',
};
```

Para `environment.prod.ts`, cambiar `CLIENTE_ID`, `REDIRECT_URL` y `SIGN_OUT_REDIRECT_URL` a los valores de producción.

---

### Paso 3 — Configurar `AppModule` (CRÍTICO: `HashLocationStrategy`)

> **Esta es la configuración más importante y menos obvia.** El flujo OIDC devuelve los tokens en el **hash** de la URL (`#id_token=...`). Angular con la estrategia de rutas por defecto (`PathLocationStrategy`) hace un request al servidor con esa URL, perdiendo el hash antes de que el servicio pueda leerlo. **`HashLocationStrategy` es obligatoria.**

```typescript
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,       // Requerido para que HttpClient funcione en los servicios
    AppRoutingModule,
    CommonModule,
    // ... resto de módulos del proyecto
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy }, // OBLIGATORIO
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

---

### Paso 4 — Configurar `AppRoutingModule` (CRÍTICO: `useHash: true`)

El router también debe saber que usa hash. Sin `useHash: true`, Angular intercepta los cambios de hash y destruye los parámetros de retorno del proveedor:

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'pages',
    loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule),
  },
  { path: '**', redirectTo: 'pages/login', pathMatch: 'full' }, // Redirige a login por defecto
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { useHash: true }), // OBLIGATORIO
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

---

### Paso 5 — Copiar los archivos de auth

Copia los siguientes archivos al nuevo repo (ver código completo en [Sección 13](#13-código-fuente-completo-de-archivos-de-auth)):

```
src/app/@core/utils/implicit_autentication.service.ts
src/app/@core/_guards/auth.guard.ts
src/app/@core/services/infopersonal.service.ts
src/app/@core/services/funcs.service.ts
src/app/@core/data/models/document.ts
src/app/@core/data/models/tercero.ts
src/app/@core/data/models/datos_identificacion_tercero.ts
src/app/pages/login/login.component.ts
src/app/pages/login/login.component.html
```

---

### Paso 6 — Arrancar el servicio desde `AppComponent`

El servicio `ImplicitAutenticationService` **se auto-inicializa** en su constructor (llama a `init()`). Para que eso ocurra al arrancar la app, basta con inyectarlo en el constructor de `AppComponent`. No es necesario llamar a ningún método manualmente:

```typescript
import { Component } from '@angular/core';
import { ImplicitAutenticationService } from './@core/utils/implicit_autentication.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent {
  constructor(private autenticacion: ImplicitAutenticationService) {
    // El solo hecho de inyectarlo aquí instancia el singleton y dispara init()
  }

  logout() {
    const confirm = window.confirm('¿Estás seguro de cerrar sesión?');
    if (confirm) {
      this.autenticacion.logout('from header');
    }
  }
}
```

> Si `AppComponent` **no** inyecta el servicio, Angular no lo instancia hasta que algún componente hijo lo use, y el parsing del hash de la URL ocurrirá demasiado tarde (o nunca en la primera carga).

---

### Paso 7 — Registrar el módulo de login y rutas protegidas

En el módulo de páginas (`PagesModule` o equivalente), registra `LoginComponent` en `declarations` y configura las rutas con `AuthGuard`:

```typescript
// pages-routing.module.ts
import { AuthGuard } from '../@core/_guards/auth.guard';

const routes: Routes = [{
  path: '',
  component: PagesComponent,
  children: [
    { path: 'login', component: LoginComponent },                    // Pública
    {
      path: 'home',
      component: HomeComponent,
      canActivate: [AuthGuard],
      data: { roles: ['Internal/selfsignup', 'Internal/everyone'] }, // Roles requeridos
    },
    // ... resto de rutas protegidas con el mismo patrón
    { path: '', redirectTo: 'home', pathMatch: 'full' },
  ],
}];
```

---

### Paso 8 — Usar datos del usuario en componentes

#### Obtener email y roles (desde el observable):
```typescript
constructor(private autenticacion: ImplicitAutenticationService) {}

ngOnInit() {
  this.autenticacion.user$.subscribe((data: any) => {
    const { user, userService } = data;
    this.email = user?.email ?? userService?.email ?? '';
    this.roles = userService?.role ?? [];
  });
}
```

#### Obtener el TerceroId (para consultar perfil completo):
```typescript
constructor(
  private autenticacion: ImplicitAutenticationService,
  private infoPersonalService: InfoPersonalService,
) {}

async ngOnInit() {
  // Paso 1: obtener email del JWT
  const { email } = this.autenticacion.getPayload();

  // Paso 2: obtener número de documento
  const { documento } = await this.infoPersonalService
    .getDocumentIdByEmail(environment.API_GET_IDENTIFICATION, { user: email })
    .toPromise() as any;

  // Paso 3: obtener TerceroId a partir del documento
  const data = await this.infoPersonalService
    .getInformationByDocument(environment.DATOS_IDENTIFICACION_TERCERO_ENDPOINT, documento)
    .toPromise() as any[];

  const terceroId = data[0].TerceroId.Id;
}
```

---

### Paso 9 — Adaptar el `CLIENTE_ID` para el nuevo proyecto

Cada aplicación que use WSO2 debe estar **registrada como Service Provider** en el servidor de autorización con su propia `REDIRECT_URL`. El `CLIENTE_ID` que figura en este repo es exclusivo de SISE. Para el nuevo proyecto debes:

1. Registrar la nueva app en WSO2 (`autenticacion.portaloas.udistrital.edu.co`) como un nuevo Service Provider con flujo implícito.
2. Registrar la `REDIRECT_URL` exacta (incluyendo el slash final si aplica).
3. Obtener el nuevo `CLIENTE_ID` y reemplazarlo en `environment.ts` y `environment.prod.ts`.

---

### Resumen de checklist de implementación

```
[ ] npm install ts-md5 sweetalert2
[ ] environment.ts: bloque TOKEN completo con CLIENTE_ID correcto
[ ] AppModule: HashLocationStrategy registrado en providers
[ ] AppRoutingModule: RouterModule.forRoot con useHash: true
[ ] AppComponent: inyecta ImplicitAutenticationService en el constructor
[ ] Archivos copiados: service, guard, infopersonal, funcs, modelos
[ ] LoginComponent: declarado en el módulo de páginas, ruta /login sin guard
[ ] Rutas protegidas: canActivate: [AuthGuard] + data.roles
[ ] Verificar que REDIRECT_URL en environment coincide con lo registrado en WSO2
```

---

## 13. Código fuente completo de archivos de auth

### 13.1 `implicit_autentication.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Md5 } from 'ts-md5';
import { BehaviorSubject, of } from 'rxjs';
import Swal from 'sweetalert2';
import { delay, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImplicitAutenticationService {
  environment = environment.TOKEN;
  logoutUrl: any;
  params: any;
  payload: any;
  timeActiveAlert: number = 4000;
  isLogin = false;
  private user: any;
  private timeLogoutBefore = 1000;   // ms antes del vencimiento para disparar logout
  private timeAlert = 300000;        // 5 minutos antes del vencimiento para mostrar alerta

  private userSubject = new BehaviorSubject({});
  public user$ = this.userSubject.asObservable();

  private menuSubject = new BehaviorSubject({});
  public menu$ = this.menuSubject.asObservable();

  private logoutSubject = new BehaviorSubject('');
  public logout$ = this.logoutSubject.asObservable();

  httpOptions: { headers: HttpHeaders };

  constructor(private httpClient: HttpClient) {
    this.init(this.environment);
    // Cuando la pestaña vuelve a ser visible, recalcula expiración
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const expires = this.setExpiresAt();
        this.autologout(expires);
      }
    });
  }

  init(entorno): any {
    this.environment = entorno;

    if (window.localStorage.getItem('id_token') === null) {
      // Primera carga: intentar leer tokens del hash de la URL
      const params: any = {};
      const queryString = location.hash.substring(1);
      const regex = /([^&=]+)=([^&]*)/g;
      let m;
      while ((m = regex.exec(queryString))) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
      }

      if (!!params['id_token']) {
        const id_token_array = (params['id_token']).split('.');
        const payload = JSON.parse(atob(id_token_array[1]));
        window.localStorage.setItem('access_token', params['access_token']);
        window.localStorage.setItem('expires_in', params['expires_in']);
        window.localStorage.setItem('state', params['state']);
        window.localStorage.setItem('id_token', params['id_token']);
        this.httpOptions = {
          headers: new HttpHeaders({
            'Accept': 'application/json',
            'Authorization': `Bearer ${params['access_token']}`,
          }),
        };
        this.updateAuth(payload);
      } else {
        this.clearStorage();
      }
    } else {
      // Sesión ya existente en localStorage
      const id_token = window.localStorage.getItem('id_token').split('.');
      const payload = JSON.parse(atob(id_token[1]));
      this.updateAuth(payload);
    }

    const expires = this.setExpiresAt();
    this.autologout(expires);
    this.clearUrl();
  }

  updateAuth(payload) {
    const user = localStorage.getItem('user');
    if (user) {
      // Si ya existe el objeto user en cache, emitirlo directamente sin llamar al MID
      this.userSubject.next(JSON.parse(atob(user)));
    } else {
      this.httpOptions = {
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        }),
      };
      // Llamar al MID para obtener roles y documento; reintentar hasta 3 veces ante fallos
      this.httpClient.post<any>(this.environment.AUTENTICACION_MID, { user: payload.email }, this.httpOptions)
        .pipe(retry(3))
        .subscribe((res: any) => {
          this.clearUrl();
          localStorage.setItem('user', btoa(JSON.stringify({ ...{ user: payload }, ...{ userService: res } })));
          this.userSubject.next({ ...{ user: payload }, ...{ userService: res } });
        }, (error) => console.log(error));
    }
  }

  public logout(action): void {
    const state = localStorage.getItem('state');
    const idToken = localStorage.getItem('id_token');
    if (!!state && !!idToken) {
      this.logoutUrl = this.environment.SIGN_OUT_URL;
      this.logoutUrl += '?id_token_hint=' + idToken;
      this.logoutUrl += '&post_logout_redirect_uri=' + this.environment.SIGN_OUT_REDIRECT_URL;
      this.logoutUrl += '&state=' + state;
      this.clearStorage();
      this.logoutSubject.next(action);
      window.location.replace(this.logoutUrl);
    }
  }

  public getPayload(): any {
    const idToken = window.localStorage.getItem('id_token').split('.');
    return JSON.parse(atob(idToken[1]));
  }

  public getRole() {
    return new Promise((resolve) => {
      this.user$.subscribe((data: any) => {
        const { user, userService } = data;
        const roleUser = typeof user.role !== 'undefined' ? user.role : [];
        const roleUserService = typeof userService.role !== 'undefined' ? userService.role : [];
        const roles = (roleUser.concat(roleUserService)).filter((r: any) => r.indexOf('/') === -1);
        resolve(roles);
      });
    });
  }

  public getMail() {
    return new Promise((resolve) => {
      this.user$.subscribe((data: any) => resolve(data.userService.email));
    });
  }

  public getDocument() {
    return new Promise((resolve) => {
      this.user$.subscribe((data: any) => resolve(data.userService.documento));
    });
  }

  public logoutValid() {
    let state;
    let valid = true;
    const queryString = location.search.substring(1);
    const regex = /([^&=]+)=([^&]*)/g;
    let m;
    while (!!(m = regex.exec(queryString))) {
      state = decodeURIComponent(m[2]);
    }
    if (window.localStorage.getItem('state') === state) {
      this.clearStorage();
      valid = true;
    } else {
      valid = false;
    }
    return valid;
  }

  public login(flag): boolean {
    if (
      window.localStorage.getItem('id_token') === 'undefined' ||
      window.localStorage.getItem('id_token') === null ||
      this.logoutValid()
    ) {
      if (!flag) this.getAuthorizationUrl();
      return false;
    }
    return true;
  }

  public clearUrl() {
    const clean_uri = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, clean_uri);
  }

  public getAuthorizationUrl() {
    this.params = this.environment;
    if (!this.params.hasOwnProperty('nonce')) {
      this.params = { ...this.params, ...{ nonce: this.generateState() } };
    }
    if (!this.params.state) {
      this.params.state = this.generateState();
    }
    let url = this.params.AUTORIZATION_URL + '?' +
      'client_id=' + encodeURIComponent(this.params.CLIENTE_ID) + '&' +
      'redirect_uri=' + encodeURIComponent(this.params.REDIRECT_URL) + '&' +
      'response_type=' + encodeURIComponent(this.params.RESPONSE_TYPE) + '&' +
      'scope=' + encodeURIComponent(this.params.SCOPE) + '&' +
      'state_url=' + encodeURIComponent(window.location.hash);
    if (this.params.hasOwnProperty('nonce')) {
      url += '&nonce=' + encodeURIComponent(this.params.nonce);
    }
    url += '&state=' + encodeURIComponent(this.params.state);
    window.location.replace(url);
    return url;
  }

  public generateState(): any {
    const text = ((Date.now() + Math.random()) * Math.random()).toString().replace('.', '');
    return Md5.hashStr(text);
  }

  public setExpiresAt(): any {
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt || expiresAt === 'Invalid Date') {
      const expiresAtDate = new Date();
      expiresAtDate.setSeconds(expiresAtDate.getSeconds() + parseInt(window.localStorage.getItem('expires_in'), 10));
      window.localStorage.setItem('expires_at', new Date(expiresAtDate).toUTCString());
      return new Date(expiresAtDate);
    } else {
      return expiresAt === 'Invalid Date' ? false : new Date(expiresAt);
    }
  }

  autologout(expires): void {
    if (expires) {
      this.isLogin = true;
      const expiresIn = (new Date(expires)).getTime() - (new Date()).getTime();
      if (expiresIn < this.timeLogoutBefore) {
        this.clearStorage();
        this.logoutSubject.next('logout-auto-only-localstorage');
        location.reload();
      } else {
        const timerDelay = expiresIn > this.timeLogoutBefore ? expiresIn - this.timeLogoutBefore : this.timeLogoutBefore;
        if (!isNaN(expiresIn)) {
          // Logout automático al vencer el token
          of(null).pipe(delay(timerDelay - this.timeLogoutBefore)).subscribe(() => {
            this.logout('logout-auto');
          });
          // Alerta 5 minutos antes
          if (this.timeAlert < timerDelay) {
            of(null).pipe(delay(timerDelay - this.timeAlert)).subscribe(() => {
              Swal.fire({
                position: 'top-end',
                icon: 'info',
                title: `Su sesión se cerrará en ${this.timeAlert / 60000} minutos`,
                showConfirmButton: false,
                timer: this.timeActiveAlert,
              });
            });
          }
        }
      }
    }
  }

  public expired() {
    return (new Date(window.localStorage.getItem('expires_at')) < new Date());
  }

  public live() {
    return this.isLogin;
  }

  public clearStorage() {
    this.isLogin = false;
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
}
```

---

### 13.2 `auth.guard.ts`

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { Documento } from '../data/models/document';
import { InfoPersonalService } from '../services/infopersonal.service';
import { ImplicitAutenticationService } from '../utils/implicit_autentication.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private infoPersonalService: InfoPersonalService,
    private autenticacion: ImplicitAutenticationService,
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let valid = false;
    const roles = route.data['roles'] as Array<string>;

    const { email } = this.autenticacion.getPayload();
    const body = { user: email };
    const { documento, documento_compuesto, ...rest } = await this.infoPersonalService
      .getDocumentIdByEmail(environment.API_GET_IDENTIFICATION, body)
      .toPromise() as Documento & { role: string[] };

    const rolesArr: string[] = (rest as any)['role'];

    if (rolesArr) {
      for (const userRole of rolesArr) {
        for (const requiredRole of roles) {
          if (userRole === requiredRole) {
            valid = true;
            break;
          }
        }
        if (valid) break;
      }
    }

    if (!valid) this.router.navigate(['/']);
    return valid;
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    return this.canActivate(route, state);
  }
}
```

---

### 13.3 `infopersonal.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ImplicitAutenticationService } from '../utils/implicit_autentication.service';
import { FuncsService } from './funcs.service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class InfoPersonalService {

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private readonly httpClient: HttpClient,
    private funcsService: FuncsService,
  ) {}

  createTercero(endpoint, data) {
    return this.httpClient.post(endpoint, data, this.funcsService.openIDDefaultOptions());
  }

  traerUserInfo(endpoint, data) {
    return this.httpClient.post(endpoint, data, this.funcsService.openIDDefaultOptions()).pipe(
      catchError(error => this.handleError(error, () => this.traerUserInfo(endpoint, data))),
    );
  }

  protected handleError(error: HttpErrorResponse, continuation: () => Observable<any>) {
    if (error.status === 404 || error.status === 400) return of(false);
  }

  getDocumentIdByEmail(endpoint, data) {
    return this.httpClient.post(endpoint, data, this.funcsService.openIDDefaultOptions());
  }

  getInformationByDocument(endpoint, document) {
    return this.httpClient.get(endpoint + `?query=Numero:${document}`, this.funcsService.openIDDefaultOptions());
  }

  getInfoComplementariaTercero(endpoint, params) {
    return this.httpClient.get<any>(endpoint + params, this.funcsService.openIDDefaultOptions());
  }

  getDocumentTypes(endpoint) {
    return this.httpClient.get(endpoint, this.funcsService.openIDDefaultOptions());
  }

  updateInformation(endpoint, data) {
    return this.httpClient.put(endpoint, data, this.funcsService.openIDDefaultOptions());
  }

  async getTerceroId(): Promise<number | undefined> {
    const { email } = this.autenticacion.getPayload();
    const { documento } = await this.getDocumentIdByEmail(
      environment.API_GET_IDENTIFICATION,
      { user: email },
    ).toPromise() as any;

    if (!documento) {
      console.error('No se pudo obtener el documento del usuario');
      return undefined;
    }

    const data = await this.getInformationByDocument(
      environment.DATOS_IDENTIFICACION_TERCERO_ENDPOINT,
      documento,
    ).toPromise() as any[];

    return data[0].TerceroId.Id as number;
  }
}
```

---

### 13.4 `funcs.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class FuncsService {

  /**
   * Retorna los headers HTTP con el Bearer token leído de localStorage.
   * Usar en todas las llamadas que requieren autenticación.
   */
  openIDDefaultOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': 'Bearer ' + window.localStorage.getItem('access_token'),
      }),
    };
  }
}
```

---

### 13.5 `document.ts` (modelo)

```typescript
export interface Documento {
  documento: string;
  documento_compuesto: string;
}
```

---

### 13.6 `login.component.ts`

```typescript
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ImplicitAutenticationService } from '../../@core/utils/implicit_autentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {

  @Input('isloading') isloading: boolean = false;
  @Output('loginEvent') loginEvent: EventEmitter<any> = new EventEmitter();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Si ya hay sesión activa, ir directo al home
    if (localStorage.getItem('access_token')) {
      this.router.navigate(['/pages/home']);
    }
  }

  login() {
    this.isloading = true;
    this.loginEvent.next('clicked');
    this.autenticacion.login(false); // false = sí redirigir a WSO2
  }
}
```

---

### 13.7 `login.component.html`

```html
<div class="login-container">
  <div class="login">
    <h1>Mi Aplicación</h1>
    <button *ngIf="!isloading" (click)="login()">Iniciar Sesión</button>
    <span *ngIf="isloading">Redirigiendo...</span>
  </div>
</div>
```

> Personalizar el HTML según el diseño del nuevo proyecto. Lo funcional es únicamente el `(click)="login()"`.

---

### 13.8 `app.component.ts` (fragmento mínimo)

```typescript
import { Component } from '@angular/core';
import { ImplicitAutenticationService } from './@core/utils/implicit_autentication.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {
  // La inyección en el constructor es lo que instancia el servicio y dispara init()
  constructor(private autenticacion: ImplicitAutenticationService) {}

  logout() {
    if (window.confirm('¿Cerrar sesión?')) {
      this.autenticacion.logout('from header');
    }
  }
}
```
