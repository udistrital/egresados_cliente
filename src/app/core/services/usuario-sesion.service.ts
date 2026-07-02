/* ============================================================
   Sesión de usuario derivada del token WSO2 + userRol, enriquecida
   con el perfil académico del egresado (C-2a):
   token → userRol (documento) → terceros_crud (nombre/apellidos)
        → sga_mid consultar_persona (código, programa)
        → proyecto_academico_crud (facultad)
   Centraliza la construcción del usuario que antes duplicaban
   dashboard/catalogo/solicitudes/beneficio-detalle, y expone
   los ids locales del módulo (usuario/egresado/empresa).

   Los ids locales del egresado salen del JIT provisioning del MID
   (POST /v1/egresados/provision, sin body: la identidad se deriva
   del token vía OIDC userinfo). El de empresa sigue pendiente de
   cablear (POST /v1/empresas/provision + selector multiempresa).
   ============================================================ */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BeneficiosMidService } from '../api/beneficios-mid.service';
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
    private midApi: BeneficiosMidService,
  ) {
    this.autenticacion.user$.subscribe((data: any) => {
      const { user, userService } = data ?? {};
      if (!user && !userService) return;
      const base = this.construir(user, userService);
      this.sesionSubject.next(base);
      if (base.esEmpresa) {
        this.provisionarEmpresa();
      } else {
        this.enriquecerPerfilEgresado(base);
        this.provisionarEgresado();
      }
    });
  }

  /** Última sesión conocida (lectura síncrona para guards y fachadas). */
  get sesion(): UsuarioSesion {
    return this.sesionSubject.value;
  }

  /** Mezcla un cambio parcial sobre la última sesión emitida (evita que flujos
   *  asíncronos concurrentes —perfil C-2a y JIT— se pisen entre sí). */
  private patch(p: Partial<UsuarioSesion>): void {
    this.sesionSubject.next({ ...this.sesionSubject.value, ...p });
  }

  /**
   * JIT provisioning de empresa: resuelve (o crea) usuario/empresa/usuario_empresa
   * locales a partir de los proveedores de Ágora asociados al correo del token.
   * Se toma la primera empresa (es_principal); el selector multiempresa para el
   * caso 1:N queda pendiente de UI (GET /v1/usuarios/:id/empresas ya existe).
   */
  private provisionarEmpresa(): void {
    if (this.sesion.empresaId != null) return;
    this.midApi.provisionarEmpresa().subscribe({
      next: r => {
        const principal = r.empresas?.[0];
        if (!(r.usuario_id > 0 && principal && principal.empresa_id > 0)) {
          console.warn('[jit] provision de empresa devolvió datos inválidos — ids locales quedan null', r);
          return;
        }
        const razonSocial = principal.proveedor?.razon_social;
        this.patch({
          usuarioId: r.usuario_id,
          empresaId: principal.empresa_id,
          // userRol de empresa no trae nombre de persona: la razón social es la
          // mejor identidad visible (antes quedaba el correo).
          ...(razonSocial ? { nombre: razonSocial, primerNombre: razonSocial } : {}),
        });
      },
      error: err => console.warn('[jit] provision de empresa falló — ids locales quedan null', err),
    });
  }

  /**
   * JIT provisioning contra el MID: resuelve (o crea) usuario/egresado locales.
   * Si falla, los ids quedan null y la UI conserva el aviso de perfil no habilitado.
   */
  private provisionarEgresado(): void {
    if (this.sesion.egresadoId != null) return;
    this.midApi.provisionarEgresado().subscribe({
      next: r => {
        // Un id 0/negativo es una respuesta corrupta: dejar null (aviso de perfil
        // no habilitado) en vez de propagar un id inválido a las solicitudes.
        if (!(r.usuario_id > 0 && r.egresado_id > 0)) {
          console.warn('[jit] provision devolvió ids inválidos — ids locales quedan null', r);
          return;
        }
        this.patch({ usuarioId: r.usuario_id, egresadoId: r.egresado_id });
      },
      error: err => console.warn('[jit] provision de egresado falló — ids locales quedan null', err),
    });
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
    // Rama egresado/empresa por el Estado de userRol (regla D-5, misma que el MID):
    // 'E' = egresado; cualquier OTRO valor presente (incluido vacío, caso empresa
    // self-signup verificado 2026-07-01) = usuario de empresa. Si userRol falló y
    // Estado no llegó, se asume egresado (default seguro del portal).
    // ROLES_EMPRESA queda como refuerzo para cuando OATI cree los roles (D-8).
    const estado: unknown = userService?.Estado ?? userService?.estado;
    const esEmpresa =
      (typeof estado === 'string' && estado.trim().toUpperCase() !== 'E') ||
      roles.some(r => environment.ROLES_EMPRESA.includes(r));

    return {
      iniciales: iniciales(nombreCompleto, email),
      primerNombre: primerNombre || email.split('@')[0],
      nombre: nombreCompleto || email,
      email,
      documento,
      // Etiqueta del portal, NO el rol crudo de WSO2 (clalapea traía roles
      // administrativos del SGA como ASISTENTE_JURIDICA que aquí son ruido).
      rol: esEmpresa ? 'Empresa aliada' : 'Egresado',
      esEmpresa,
      // Los ids locales los resuelve el JIT provisioning (provisionarEgresado).
      usuarioId: null,
      egresadoId: null,
      empresaId: null,
    };
  }

  /**
   * Completa la sesión del egresado con nombre real, código, programa y facultad.
   * Cada paso degrada con gracia: si un servicio falla, se conserva lo que ya hay.
   */
  private enriquecerPerfilEgresado(base: UsuarioSesion): void {
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
      // Patch de SOLO los campos del perfil: la sesión derivada de `base` trae los ids
      // locales en null y sobreescribirla completa pisaría los del JIT si llegó antes.
    ).subscribe(({ nombre, primerNombre, iniciales, codigo, programa, facultad }) =>
      this.patch({ nombre, primerNombre, iniciales, codigo, programa, facultad }));
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
