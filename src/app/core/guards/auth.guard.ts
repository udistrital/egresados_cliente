/* ============================================================
   Guards de ruta:
   - authGuard: exige sesión iniciada (token WSO2 vigente).
   - rolEgresadoGuard / rolEmpresaGuard: exigen además el PERFIL
     (esEmpresa, derivado del Estado de userRol — D-5). Un perfil
     que intenta entrar a las vistas del otro es redirigido a su
     propio portal, no al login.
   TODO(D-8): cuando OATI cree los roles de WSO2 del módulo
   (environment.ROLES_EGRESADO/ROLES_EMPRESA), reforzar estos
   guards comparando también contra esos roles.
   ============================================================ */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { ImplicitAutenticationService } from '../services/implicit-autentication.service';
import { UsuarioSesionService } from '../services/usuario-sesion.service';

function haySesion(autenticacion: ImplicitAutenticationService): boolean {
  // login(true) solo verifica el token en localStorage, sin redirigir a WSO2
  return autenticacion.login(true) && !autenticacion.expired();
}

export const authGuard: CanActivateFn = () => {
  const autenticacion = inject(ImplicitAutenticationService);
  const router = inject(Router);
  if (haySesion(autenticacion)) return true;
  return router.createUrlTree(['/login']);
};

/** Exige sesión + perfil. El perfil se conoce cuando userRol responde (Estado),
 *  así que el guard espera la primera sesión resuelta antes de decidir. */
function perfilGuard(requiereEmpresa: boolean): CanActivateFn {
  return () => {
    const autenticacion = inject(ImplicitAutenticationService);
    const sesionSvc = inject(UsuarioSesionService);
    const router = inject(Router);

    if (!haySesion(autenticacion)) return router.createUrlTree(['/login']);

    return firstValueFrom(sesionSvc.sesion$.pipe(
      filter(s => !!s.email),
      take(1),
      map(s => s.esEmpresa === requiereEmpresa
        ? true
        : router.createUrlTree([s.esEmpresa ? '/empresa/dashboard' : '/catalogo'])),
    ));
  };
}

export const rolEgresadoGuard: CanActivateFn = perfilGuard(false);
export const rolEmpresaGuard: CanActivateFn = perfilGuard(true);
