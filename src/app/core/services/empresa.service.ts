/* ============================================================
   Fachada del portal de empresa (RF-004/005/006/007).
   DEMO_MODE=true  → estado en memoria (movido aquí desde los
                     componentes para que sobreviva la navegación).
   DEMO_MODE=false → MID real vía BeneficiosMidService.
   ============================================================ */
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  BeneficioEmpresa, CategoriaBeneficio, Empresa, EstadoSolicitud,
  HistorialEntrada, MensajeHilo, SolicitudRecibida,
  BENEFICIOS_EMPRESA_DEMO, EMPRESA_DEMO, HISTORIAL_DEMO, MENSAJES_DEMO,
  SOLICITUDES_EMPRESA_DEMO,
} from '../../shared/oati.types';
import { BeneficiosMidService } from '../api/beneficios-mid.service';
import { ESTADO_TO_CODIGO, mapMensaje, mapSolicitudRecibida } from '../api/mappers';
import { BeneficiosService } from './beneficios.service';
import { UsuarioSesionService } from './usuario-sesion.service';

export type AccionRespuesta = 'aprobar' | 'rechazar' | 'info';

export interface FormPublicarBeneficio {
  titulo: string;
  categoria: CategoriaBeneficio | '';
  cuposIniciales: number | null;
  vigenciaHasta: string;
  resumen: string;
}

const ACCION_A_ESTADO: Record<AccionRespuesta, EstadoSolicitud> = {
  aprobar: 'aprobada',
  rechazar: 'rechazada',
  info: 'info',
};

@Injectable({ providedIn: 'root' })
export class EmpresaService {

  /* Estado demo compartido (antes vivía en cada componente) */
  private demoSolicitudes: SolicitudRecibida[] = [...SOLICITUDES_EMPRESA_DEMO];
  private demoBeneficios: BeneficioEmpresa[] = [...BENEFICIOS_EMPRESA_DEMO];
  private demoHistorial = HISTORIAL_DEMO;
  private demoMensajes = MENSAJES_DEMO;
  private demoNextId = 100;

  constructor(
    private api: BeneficiosMidService,
    private beneficiosSvc: BeneficiosService,
    private sesionSvc: UsuarioSesionService,
  ) {}

  /* ── Identidad de la empresa ───────────────────────────────── */

  getEmpresa(): Observable<Empresa> {
    if (environment.DEMO_MODE) return of(EMPRESA_DEMO);
    // TODO backend: el MID no expone GET /v1/empresas/:id; mientras tanto se
    // construye una vista mínima con los datos del token (D-5/D-7 pendientes).
    const s = this.sesionSvc.sesion;
    return of({
      id: String(s.empresaId ?? ''),
      nombre: s.nombre,
      nit: s.documento,
      sector: '', sitioWeb: '', email: s.email, telefono: '',
      representante: '', descripcion: '', estado: 'aprobada' as const,
      iniciales: s.iniciales,
    });
  }

  /* ── Bandeja de solicitudes (RF-006) ───────────────────────── */

  getBandeja(): Observable<SolicitudRecibida[]> {
    if (environment.DEMO_MODE) return of(this.demoSolicitudes);
    const empresaId = this.sesionSvc.sesion.empresaId;
    if (empresaId == null) return of([]); // JIT provisioning pendiente en el MID
    return this.api.getBandejaEmpresa(empresaId).pipe(
      map(dtos => (dtos ?? []).map(mapSolicitudRecibida)),
    );
  }

  /**
   * RF-007: responder una solicitud (RN-003/004/005 las valida el MID).
   * Devuelve la bandeja actualizada.
   */
  responder(s: SolicitudRecibida, accion: AccionRespuesta, nota: string):
    Observable<SolicitudRecibida[]> {
    if (environment.DEMO_MODE) {
      this.responderDemo(s.radicado, accion, nota);
      return of(this.demoSolicitudes);
    }
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const codigo = ESTADO_TO_CODIGO[ACCION_A_ESTADO[accion]] as
      'APROBADA' | 'RECHAZADA' | 'REQUIERE_INFO';
    return this.api.responderSolicitud(s.id, {
      estado_nuevo: codigo,
      justificacion: nota || undefined,
      usuario_id: this.sesionSvc.sesion.usuarioId ?? undefined,
    }).pipe(switchMap(() => this.getBandeja()));
  }

  /* ── Bitácora y mensajes del drawer ────────────────────────── */

  getHistorial(s: SolicitudRecibida): Observable<HistorialEntrada[]> {
    if (environment.DEMO_MODE) return of(this.demoHistorial[s.radicado] ?? []);
    // Mismo pendiente que en SolicitudesService: falta el endpoint en el MID.
    return of([]);
  }

  getMensajes(s: SolicitudRecibida): Observable<MensajeHilo[]> {
    if (environment.DEMO_MODE) return of(this.demoMensajes[s.radicado] ?? []);
    if (s.id == null) return of([]);
    const propio = this.sesionSvc.sesion.usuarioId;
    return this.api.getMensajes(s.id).pipe(
      map(dtos => (dtos ?? []).map(d =>
        mapMensaje(d, uid => (uid != null && uid === propio ? 'empresa' : 'egresado')))),
      catchError(() => of([] as MensajeHilo[])),
    );
  }

  enviarMensaje(s: SolicitudRecibida, nombreEmpresa: string, texto: string):
    Observable<MensajeHilo[]> {
    if (environment.DEMO_MODE) {
      this.demoMensajes[s.radicado] = [
        ...(this.demoMensajes[s.radicado] ?? []),
        { autor: 'empresa', nombre: nombreEmpresa, mensaje: texto, fecha: 'Ahora' },
      ];
      return of(this.demoMensajes[s.radicado]);
    }
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const usuarioId = this.sesionSvc.sesion.usuarioId;
    if (usuarioId == null) return throwError(() => new Error('Sesión sin usuario local (JIT pendiente)'));
    return this.api.enviarMensaje(s.id, usuarioId, texto).pipe(
      switchMap(() => this.getMensajes(s)),
    );
  }

  /* ── Beneficios publicados (RF-005) ────────────────────────── */

  getBeneficiosEmpresa(): Observable<BeneficioEmpresa[]> {
    if (environment.DEMO_MODE) return of(this.demoBeneficios);
    // TODO backend: falta GET /v1/empresas/:id/beneficios en el MID (el catálogo
    // público solo lista PUBLICADOS de todas las empresas).
    return of([]);
  }

  /** RF-005: publicar un beneficio. El MID exige empresa APROBADA (RN-008b). */
  publicar(form: FormPublicarBeneficio, empresa: Empresa): Observable<BeneficioEmpresa[]> {
    if (environment.DEMO_MODE) {
      const nuevo: BeneficioEmpresa = {
        id: `b${this.demoNextId++}`,
        titulo: form.titulo.trim(),
        empresa: empresa.nombre,
        isotipo: empresa.iniciales,
        categoria: form.categoria as CategoriaBeneficio,
        cuposIniciales: form.cuposIniciales!,
        cuposRestantes: form.cuposIniciales!,
        vigenciaHasta: form.vigenciaHasta,
        publicado: 'Ahora',
        destacado: false,
        resumen: form.resumen.trim(),
        estadoPublicacion: 'activo',
        solicitudesRecibidas: 0,
        solicitudesPendientes: 0,
      };
      this.demoBeneficios = [nuevo, ...this.demoBeneficios];
      return of(this.demoBeneficios);
    }

    const { empresaId, usuarioId } = this.sesionSvc.sesion;
    if (empresaId == null) return throwError(() => new Error('Sesión sin empresa local (JIT pendiente)'));
    return this.beneficiosSvc.categorias$.pipe(
      switchMap(cats => {
        // El MID recibe el id de parámetro de la categoría, no el nombre
        const categoriaId = [...cats.entries()]
          .find(([, nombre]) => nombre === form.categoria)?.[0];
        return this.api.publicarBeneficio(empresaId, {
          titulo: form.titulo.trim(),
          // TODO frontend: separar descripción y condiciones en el formulario
          // (el MID exige ambos campos, RN-008b); hoy el form solo tiene "resumen".
          descripcion: form.resumen.trim(),
          condiciones: form.resumen.trim(),
          categoria_beneficio_id: categoriaId,
          fecha_inicio: new Date().toISOString().slice(0, 10),
          fecha_fin: form.vigenciaHasta,
          cupos_total: form.cuposIniciales,
          usuario_creador_id: usuarioId ?? undefined,
        });
      }),
      switchMap(() => this.getBeneficiosEmpresa()),
    );
  }

  /* ── Demo: réplica de las reglas que aplica el MID ─────────── */

  private responderDemo(radicado: string, accion: AccionRespuesta, nota: string): void {
    const anterior = this.demoSolicitudes.find(x => x.radicado === radicado)?.estado;
    const nuevoEstado = ACCION_A_ESTADO[accion];

    this.demoSolicitudes = this.demoSolicitudes.map(x =>
      x.radicado === radicado
        ? { ...x, estado: nuevoEstado, actualizada: 'Ahora', nota: nota || undefined }
        : x,
    );

    // RN-004 / C-4b: la transición queda en el historial
    this.demoHistorial[radicado] = [
      ...(this.demoHistorial[radicado] ?? []),
      {
        estadoAnterior: anterior,
        estadoNuevo: nuevoEstado,
        actor: 'empresa',
        justificacion: nota || undefined,
        fecha: 'Ahora',
      },
    ];

    // Pedir información abre el hilo: la nota es el primer mensaje de la empresa
    if (accion === 'info' && nota.trim()) {
      this.demoMensajes[radicado] = [
        ...(this.demoMensajes[radicado] ?? []),
        { autor: 'empresa', nombre: EMPRESA_DEMO.nombre, mensaje: nota.trim(), fecha: 'Ahora' },
      ];
    }
  }
}
