/* ============================================================
   Guards de ruta:
   - authGuard: exige sesión iniciada (token WSO2 o DEMO_MODE).
   - rolEgresadoGuard / rolEmpresaGuard: exigen además el rol.
   Los nombres de rol reales de WSO2 se configuran en
   environment.ROLES_EGRESADO / ROLES_EMPRESA (pendiente D-5/D-7).
   ============================================================ */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ImplicitAutenticationService } from '../services/implicit-autentication.service';

function haySesion(autenticacion: ImplicitAutenticationService): boolean {
  if (environment.DEMO_MODE) return true;
  // login(true) solo verifica el token en localStorage, sin redirigir a WSO2
  return autenticacion.login(true) && !autenticacion.expired();
}

export const authGuard: CanActivateFn = () => {
  const autenticacion = inject(ImplicitAutenticationService);
  const router = inject(Router);
  if (haySesion(autenticacion)) return true;
  return router.createUrlTree(['/login']);
};

function rolGuard(rolesPermitidos: string[]): CanActivateFn {
  return async () => {
    const autenticacion = inject(ImplicitAutenticationService);
    const router = inject(Router);

    if (!haySesion(autenticacion)) return router.createUrlTree(['/login']);
    if (environment.DEMO_MODE) {
      return rolesPermitidos.includes(environment.DEMO_ROL)
        ? true
        : router.createUrlTree(['/login']);
    }

    const roles = await autenticacion.getRole();
    return roles.some(r => rolesPermitidos.includes(r))
      ? true
      : router.createUrlTree(['/login']);
  };
}

// TODO(D-3/D-7): WSO2 aún no tiene roles definidos para este módulo y getRole()
// depende de la respuesta asíncrona de userRol. Mientras OATI confirme los
// nombres reales de los roles, las vistas de egresado solo exigen sesión
// autenticada; restaurar rolGuard(environment.ROLES_EGRESADO) cuando existan.
export const rolEgresadoGuard: CanActivateFn = authGuard;
export const rolEmpresaGuard: CanActivateFn = rolGuard(environment.ROLES_EMPRESA);
