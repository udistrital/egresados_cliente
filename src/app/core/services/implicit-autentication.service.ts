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
  private timeLogoutBefore = 1000;
  private timeAlert = 300000; // 5 min

  private userSubject = new BehaviorSubject({});
  public user$ = this.userSubject.asObservable();

  private menuSubject = new BehaviorSubject({});
  public menu$ = this.menuSubject.asObservable();

  private logoutSubject = new BehaviorSubject('');
  public logout$ = this.logoutSubject.asObservable();

  httpOptions!: { headers: HttpHeaders };

  constructor(private httpClient: HttpClient) {
    this.init(this.environment);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const expires = this.setExpiresAt();
        this.autologout(expires);
      }
    });
  }

  /**
   * Decodifica el payload de un JWT. Los JWT usan base64url (RFC 7515): alfabeto
   * con '-' y '_' y sin padding — atob() crudo EXPLOTA con esos caracteres y el
   * catch descartaba la sesión entera (el usuario se autenticaba en WSO2 y volvía
   * al login "sin razón"). Se normaliza a base64 estándar + padding, y se decodifica
   * UTF-8 (claims con tildes/ñ).
   */
  private jwtPayload(jwt: string): any {
    const b64url = jwt.split('.')[1];
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bytes = atob(padded);
    try {
      // Decodificación UTF-8 (nombres con acentos en los claims)
      return JSON.parse(decodeURIComponent(escape(bytes)));
    } catch {
      return JSON.parse(bytes);
    }
  }

  init(entorno: any): any {
    this.environment = entorno;

    if (window.localStorage.getItem('id_token') === null) {
      const params: any = {};
      const queryString = location.hash.substring(1);
      const regex = /([^&=]+)=([^&]*)/g;
      let m;
      while ((m = regex.exec(queryString))) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
      }

      if (!!params['id_token']) {
        try {
          const payload = this.jwtPayload(params['id_token']);
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
        } catch (e) {
          // id_token ilegible en el hash: descartar y dejar la sesión limpia
          console.warn('[auth] id_token del callback ilegible — se descarta la sesión', e);
          this.clearStorage();
        }
      } else {
        // Rama muda histórica: si WSO2 devuelve el callback SIN id_token (p. ej.
        // un error OAuth en el fragmento), aquí se descartaba la sesión sin dejar
        // rastro y el usuario "rebotaba al login sin razón". Registrar SIEMPRE
        // qué llegó (solo claves y campos de error, nunca valores de tokens).
        if (Object.keys(params).length > 0) {
          console.warn(
            '[auth] callback de WSO2 sin id_token — se descarta la sesión.',
            'claves recibidas:', Object.keys(params).join(', '),
            'error:', params['error'] ?? '(ninguno)',
            'descripción:', params['error_description'] ?? '(ninguna)',
          );
        }
        this.clearStorage();
      }
    } else {
      try {
        const payload = this.jwtPayload(window.localStorage.getItem('id_token')!);
        this.updateAuth(payload);
      } catch (e) {
        // Token corrupto/truncado de sesiones anteriores: si no se descarta,
        // el constructor revienta y la app entera deja de responder.
        console.warn('[auth] id_token almacenado ilegible — se descarta la sesión', e);
        this.clearStorage();
      }
    }

    const expires = this.setExpiresAt();
    this.autologout(expires);
    this.clearUrl();
  }

  roles2List(roles: string | string[] | null): string[] {
    if (Array.isArray(roles)) return roles;
    if (typeof roles === 'string') return [roles];
    return [];
  }

  updateAuth(payload: any) {
    payload.role = this.roles2List(payload.role);
    const user = localStorage.getItem('user');
    if (user) {
      this.userSubject.next(JSON.parse(atob(user)));
    } else {
      this.httpOptions = {
        headers: new HttpHeaders({
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        }),
      };
      this.httpClient.post<any>(this.environment.AUTENTICACION_MID, { user: payload.email }, this.httpOptions)
        .pipe(retry(3))
        .subscribe(
          (res: any) => {
            this.clearUrl();
            localStorage.setItem('user', btoa(JSON.stringify({ ...{ user: payload }, ...{ userService: res } })));
            this.userSubject.next({ ...{ user: payload }, ...{ userService: res } });
          },
          (error) => {
            // Sin userRol no hay documento/roles, pero el payload del id_token
            // alcanza para mostrar email y no dejar la UI en "Cargando…"
            console.warn('[auth] token/userRol falló — usando solo el payload del id_token', error);
            this.userSubject.next({ user: payload });
          },
        );
    }
  }

  public logout(action: string): void {
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
    return this.jwtPayload(window.localStorage.getItem('id_token')!);
  }

  public getRole(): Promise<string[]> {
    return new Promise((resolve) => {
      this.user$.subscribe((data: any) => {
        const { user, userService } = data;
        const roleUser: string[] = typeof user?.role !== 'undefined' ? user.role : [];
        const roleUserService: string[] = typeof userService?.role !== 'undefined' ? userService.role : [];
        const roles = (roleUser.concat(roleUserService)).filter((r: string) => r.indexOf('/') === -1);
        resolve(roles);
      });
    });
  }

  public getMail(): Promise<string> {
    return new Promise((resolve) => {
      this.user$.subscribe((data: any) => resolve(data.userService?.email ?? ''));
    });
  }

  public getDocument(): Promise<string> {
    return new Promise((resolve) => {
      this.user$.subscribe((data: any) => resolve(data.userService?.documento ?? ''));
    });
  }

  public logoutValid(): boolean {
    let state: string | undefined;
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

  public login(flag: boolean): boolean {
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

  public clearUrl(): void {
    // Solo limpiar cuando el hash trae la respuesta OAuth de WSO2 (id_token=…).
    // La app usa hash routing (useHash): el hash normal es la RUTA Angular
    // (#/empresa/dashboard, #/catalogo…) y borrarlo aquí hacía que cualquier
    // refresh perdiera la ruta y cayera al login.
    if (!window.location.hash.includes('id_token=')) return;
    const clean_uri = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, clean_uri);
  }

  public getAuthorizationUrl(): string {
    this.params = { ...this.environment };
    if (!this.params.hasOwnProperty('nonce')) {
      this.params = { ...this.params, nonce: this.generateState() };
    }
    if (!this.params.state) {
      this.params.state = this.generateState();
    }
    // OJO: NO agregar prompt=login aquí. Se intentó (2026-07-02) para forzar el
    // formulario de credenciales con SSO activo, pero el WSO2 de la UD acepta las
    // credenciales y devuelve el callback SIN id_token → sesión descartada y el
    // usuario rebota al login. Para cambiar de cuenta: "Cerrar sesión" (mata el
    // SSO en WSO2) y luego iniciar sesión. Confirmar soporte de prompt con OATI.
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

  public generateState(): string {
    const text = ((Date.now() + Math.random()) * Math.random()).toString().replace('.', '');
    return Md5.hashStr(text) as string;
  }

  public setExpiresAt(): Date | false {
    const expiresAt = localStorage.getItem('expires_at');
    if (!expiresAt || expiresAt === 'Invalid Date') {
      const expiresAtDate = new Date();
      const expiresIn = parseInt(window.localStorage.getItem('expires_in') ?? '0', 10);
      if (isNaN(expiresIn) || expiresIn === 0) return false;
      expiresAtDate.setSeconds(expiresAtDate.getSeconds() + expiresIn);
      window.localStorage.setItem('expires_at', new Date(expiresAtDate).toUTCString());
      return new Date(expiresAtDate);
    } else {
      return expiresAt === 'Invalid Date' ? false : new Date(expiresAt);
    }
  }

  autologout(expires: Date | false): void {
    if (!expires) return;
    this.isLogin = true;
    const expiresIn = (new Date(expires)).getTime() - (new Date()).getTime();
    if (expiresIn < this.timeLogoutBefore) {
      this.clearStorage();
      this.logoutSubject.next('logout-auto-only-localstorage');
      location.reload();
    } else {
      const timerDelay = expiresIn > this.timeLogoutBefore ? expiresIn - this.timeLogoutBefore : this.timeLogoutBefore;
      if (!isNaN(expiresIn)) {
        of(null).pipe(delay(timerDelay - this.timeLogoutBefore)).subscribe(() => {
          this.logout('logout-auto');
        });
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

  public expired(): boolean {
    return (new Date(window.localStorage.getItem('expires_at') ?? '') < new Date());
  }

  public live(): boolean {
    return this.isLogin;
  }

  public clearStorage(): void {
    this.isLogin = false;
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
}
