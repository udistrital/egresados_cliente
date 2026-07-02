/* ============================================================
   AuthInterceptor — patrón del sga_cliente: anexa el access_token
   de WSO2 (Implicit Flow) como Bearer a las llamadas HTTP.
   ============================================================ */
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Sin token no hay nada que anexar; los assets locales tampoco lo necesitan
    const token = window.localStorage.getItem('access_token');
    if (!token || req.url.startsWith('assets/')) {
      return next.handle(req);
    }

    // Nota: NO se fuerza re-login en 401. Un servicio institucional puede
    // rechazar el token (scope/audience) sin que la sesión esté vencida, y
    // redirigir a WSO2 ahí crea bucles infinitos (SSO devuelve al instante).
    // La expiración real la maneja el autologout del servicio de autenticación.
    return next.handle(req.clone({
      setHeaders: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }));
  }
}
