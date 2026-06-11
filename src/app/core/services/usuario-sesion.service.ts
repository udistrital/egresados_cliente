/* ============================================================
   Sesión de usuario derivada del token WSO2 + userRol, enriquecida
   con el perfil académico del egresado (C-2a):
   token → userRol (documento) → terceros_crud (nombre/apellidos)
        → sga_mid consultar_persona (código, programa)
        → proyecto_academico_crud (facultad)
   Centraliza la construcción del usuario que antes duplicaban
   dashboard/catalogo/solicitudes/beneficio-detalle, y expone
   los ids locales del módulo (usuario/egresado/empresa).

   ⚠️ Los ids locales salen del JIT provisioning del MID, que aún
   no está implementado (bloqueado por la aprobación de la BD).
   Cuando exista el endpoint tipo GET /v1/usuarios/yo, resolverlos
   en construir() — es el ÚNICO punto a tocar.
   ============================================================ */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EGRESADO_DEMO } from '../../shared/oati.types';
import { PerfilApiService, TerceroDto } from '../api/perfil-api.service';
import { ImplicitAutenticationService } from './implicit-autentication.service';

export interface UsuarioSesion {
  iniciales: string;
  primerNombre: string;
  nombre: string;
  email: string;
  documento: string;
  rol: string;
  esEmpresa: boolean;
  /** Perfil académico (C-2a) — presentes solo para egresados */
  codigo?: string;
  programa?: string;
  facultad?: string;
  /** Foto de perfil; la UI cae a iniciales si no está (fuente pendiente con OATI) */
  fotoUrl?: string;
  /** ids locales del módulo (JIT provisioning) — null hasta que el MID los exponga */
  usuarioId: number | null;
  egresadoId: number | null;
  empresaId: number | null;
}

const SESION_VACIA: UsuarioSesion = {
  iniciales: '…', primerNombre: 'Cargando…', nombre: '', email: '', documento: '',
  rol: '', esEmpresa: false, usuarioId: null, egresadoId: null, empresaId: null,
};

@Injectable({ providedIn: 'root' })
export class UsuarioSesionService {

  private sesionSubject = new BehaviorSubject<UsuarioSesion>(SESION_VACIA);
  /** Emite la sesión cada vez que el flujo de autenticación o el perfil la actualizan. */
  readonly sesion$: Observable<UsuarioSesion> = this.sesionSubject.asObservable();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private perfilApi: PerfilApiService,
  ) {
    this.autenticacion.user$.subscribe((data: any) => {
      const { user, userService } = data ?? {};
      if (!user && !userService) return;
      const base = this.construir(user, userService);
      this.sesionSubject.next(base);
      if (!base.esEmpresa) this.enriquecerPerfilEgresado(base);
    });
  }

  /** Última sesión conocida (lectura síncrona para guards y fachadas). */
  get sesion(): UsuarioSesion {
    return this.sesionSubject.value;
  }

  private construir(user: any, userService: any): UsuarioSesion {
    const primerNombre: string = userService?.PrimerNombre ?? userService?.nombre ?? '';
    const primerApellido: string = userService?.PrimerApellido ?? userService?.apellido ?? '';
    const nombreCompleto = primerNombre && primerApellido
      ? `${primerNombre} ${primerApellido}`
      : primerNombre || user?.email || userService?.email || '';
    const email: string = userService?.email ?? userService?.Email ?? user?.email ?? '';
    const documento: string = userService?.documento ?? userService?.Documento ?? '';

    const roles: string[] = userService?.role ?? user?.role ?? [];
    const esEmpresa = roles.some(r => environment.ROLES_EMPRESA.includes(r));

    // TODO(JIT): resolver contra el MID cuando exista el endpoint de identidad local.
    // En demo se usan ids fijos coherentes con la semilla del schema.
    const demoIds = environment.DEMO_MODE
      ? { usuarioId: 1, egresadoId: esEmpresa ? null : 1, empresaId: esEmpresa ? 1 : null }
      : { usuarioId: null, egresadoId: null, empresaId: null };

    return {
      iniciales: iniciales(nombreCompleto, email),
      primerNombre: primerNombre || email.split('@')[0],
      nombre: nombreCompleto || email,
      email,
      documento,
      rol: roles[0] ?? (esEmpresa ? 'Empresa' : 'Egresado'),
      esEmpresa,
      ...demoIds,
    };
  }

  /**
   * Completa la sesión del egresado con nombre real, código, programa y facultad.
   * Cada paso degrada con gracia: si un servicio falla, se conserva lo que ya hay.
   */
  private enriquecerPerfilEgresado(base: UsuarioSesion): void {
    if (environment.DEMO_MODE) {
      this.sesionSubject.next({
        ...base,
        codigo: '20181020043',
        programa: EGRESADO_DEMO.programa,
        facultad: EGRESADO_DEMO.facultad,
      });
      return;
    }
    if (!base.documento) {
      console.warn('[perfil] sesión sin documento (¿falló token/userRol?) — no se puede consultar terceros_crud');
      return;
    }

    this.perfilApi.getTerceroPorDocumento(base.documento).pipe(
      switchMap(tercero => {
        if (!tercero) {
          console.warn(`[perfil] terceros_crud no encontró tercero para el documento ${base.documento}`);
          return of(base);
        }
        const conNombre = aplicarTercero(base, tercero);
        return this.perfilApi.getCodigosPersona(tercero.Id).pipe(
          switchMap(codigos => {
            // Activo=false → condición de egresado (C-2a)
            const codigo = codigos.find(c => c.Activo === false) ?? codigos[0];
            if (!codigo) {
              console.warn(`[perfil] consultar_persona(${tercero.Id}) no retornó códigos — ¿persona_id != TerceroId.Id?`);
              return of(conNombre);
            }
            const conAcademico: UsuarioSesion = {
              ...conNombre,
              codigo: codigo.Dato,
              ...(codigo.Proyecto ? { programa: nombrePrograma(codigo.Proyecto) } : {}),
            };
            // La variante plana de consultar_persona no trae proyecto (IdProyecto=0)
            if (!codigo.IdProyecto) return of(conAcademico);
            return this.perfilApi.getFacultadProyecto(codigo.IdProyecto).pipe(
              map(facultad => (facultad ? { ...conAcademico, facultad } : conAcademico)),
              catchError(err => {
                console.warn('[perfil] proyecto_academico_crud falló — sin facultad', err);
                return of(conAcademico);
              }),
            );
          }),
          catchError(err => {
            console.warn('[perfil] sga_mid consultar_persona falló — sin código/programa', err);
            return of(conNombre);
          }),
        );
      }),
      catchError(err => {
        console.warn('[perfil] terceros_crud falló — perfil mínimo desde el token', err);
        return of(base);
      }),
    ).subscribe(sesion => this.sesionSubject.next(sesion));
  }
}

function iniciales(nombre: string, email: string): string {
  const tokens = nombre.trim().split(/\s+/);
  return tokens.length >= 2
    ? (tokens[0][0] + tokens[1][0]).toUpperCase()
    : (nombre[0] ?? email[0] ?? '?').toUpperCase();
}

function aplicarTercero(s: UsuarioSesion, t: TerceroDto): UsuarioSesion {
  const nombre = t.NombreCompleto ||
    [t.PrimerNombre, t.SegundoNombre, t.PrimerApellido, t.SegundoApellido]
      .filter(Boolean).join(' ');
  if (!nombre) return s;
  return {
    ...s,
    nombre,
    primerNombre: t.PrimerNombre || s.primerNombre,
    iniciales: iniciales(nombre, s.email),
  };
}

/** "20700 - Ingeniería de Sistemas" → "Ingeniería de Sistemas" */
function nombrePrograma(proyecto: string): string {
  const partes = proyecto.split(' - ');
  return partes.length > 1 ? partes.slice(1).join(' - ') : proyecto;
}
