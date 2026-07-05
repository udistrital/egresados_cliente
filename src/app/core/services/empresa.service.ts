/* ============================================================
   Fachada del portal de empresa (RF-004/005/006/007) contra el
   MID real. OJO: el flujo de empresa aún está a medio cablear —
   sin JIT de empresa en el front, empresaId es null y las vistas
   degradan a vacío (pendiente 4c del plan).
   ============================================================ */
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, take } from 'rxjs/operators';
import {
  BeneficioEmpresa, DocumentoSolicitudItem, Empresa, EstadoSolicitud,
  HistorialEntrada, MensajeHilo, SolicitudRecibida,
} from '../../shared/oati.types';
import { BeneficiosMidService } from '../api/beneficios-mid.service';
import {
  ESTADO_TO_CODIGO, hoyLocalISO, mapBeneficioEmpresa, mapDocumentoSolicitud, mapMensaje, mapSolicitudRecibida,
  ordenarSolicitudesRecientes,
} from '../api/mappers';
import { BeneficiosService } from './beneficios.service';
import { UsuarioSesionService } from './usuario-sesion.service';

export type AccionRespuesta = 'aprobar' | 'rechazar' | 'info';

export interface FormPublicarBeneficio {
  titulo: string;
  /** ID del parámetro CATEGORIA_BENEFICIO como string ('' = sin seleccionar).
   *  El selector se alimenta del servicio de parámetros (C-1), así el id viaja
   *  directo al MID sin traducciones por nombre (que era donde se perdía). */
  categoria: string;
  cuposIniciales: number | null;
  vigenciaHasta: string;
  /** Descripción del beneficio: qué obtiene el egresado ("Qué obtienes" en el detalle). */
  resumen: string;
  /** Condiciones y requisitos que acepta el egresado al postularse (RN-008b).
   *  Una condición por línea → el detalle las pinta como checklist. */
  condiciones: string;
  /** Documentos que se le exigirán al egresado al postularse (opcional, RF-005-doc) */
  documentosRequeridos: { nombre: string; descripcion: string }[];
}

const ACCION_A_ESTADO: Record<AccionRespuesta, EstadoSolicitud> = {
  aprobar: 'aprobada',
  rechazar: 'rechazada',
  info: 'info',
};

@Injectable({ providedIn: 'root' })
export class EmpresaService {

  constructor(
    private api: BeneficiosMidService,
    private beneficiosSvc: BeneficiosService,
    private sesionSvc: UsuarioSesionService,
  ) {}

  /* ── Identidad de la empresa ───────────────────────────────── */

  /** Reactivo a la sesión: re-emite cuando el JIT de empresa resuelve los ids
   *  (y con ellos la razón social). Enriquecible con GET /v1/empresas/:id. */
  getEmpresa(): Observable<Empresa> {
    return this.sesionSvc.sesion$.pipe(
      map(s => ({
        id: String(s.empresaId ?? ''),
        nombre: s.nombre,
        nit: s.documento,
        sector: '', sitioWeb: '', email: s.email, telefono: '',
        representante: '', descripcion: '', estado: 'aprobada' as const,
        iniciales: s.iniciales,
      })),
    );
  }

  /* ── Bandeja de solicitudes (RF-006) ───────────────────────── */

  /** Reactivo a la sesión. NO emite mientras el JIT de empresa no resuelva el
   *  empresaId: emitir [] en esa fase hacía que la vista mostrara "sin
   *  solicitudes" (información errónea) — el componente muestra un loader hasta
   *  la primera emisión real. */
  getBandeja(): Observable<SolicitudRecibida[]> {
    return this.sesionSvc.sesion$.pipe(
      map(s => s.empresaId),
      distinctUntilChanged(),
      filter((empresaId): empresaId is number => empresaId != null),
      switchMap(empresaId => this.api.getBandejaEmpresa(empresaId).pipe(
        map(dtos => ordenarSolicitudesRecientes(dtos ?? []).map(mapSolicitudRecibida)),
      )),
    );
  }

  /**
   * RF-007: responder una solicitud (RN-003/004/005 las valida el MID).
   * `comprobante` es OPCIONAL y solo tiene efecto al aprobar (el MID rechaza el
   * body si se manda junto a rechazar/pedir info).
   * Devuelve la bandeja actualizada.
   */
  responder(s: SolicitudRecibida, accion: AccionRespuesta, nota: string,
    comprobante?: { nombreArchivo: string; fileBase64: string }):
    Observable<SolicitudRecibida[]> {
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const codigo = ESTADO_TO_CODIGO[ACCION_A_ESTADO[accion]] as
      'APROBADA' | 'RECHAZADA' | 'REQUIERE_INFO';
    return this.api.responderSolicitud(s.id, {
      estado_nuevo: codigo,
      justificacion: nota || undefined,
      usuario_id: this.sesionSvc.sesion.usuarioId ?? undefined,
      comprobante: comprobante
        ? { nombre_archivo: comprobante.nombreArchivo, file: comprobante.fileBase64 }
        : undefined,
    // take(1): getBandeja() es reactivo a la sesión y no completa; aquí basta
    // la primera bandeja fresca tras responder.
    }).pipe(switchMap(() => this.getBandeja().pipe(take(1))));
  }

  /* ── Bitácora y mensajes del drawer ────────────────────────── */

  getHistorial(s: SolicitudRecibida): Observable<HistorialEntrada[]> {
    // Mismo pendiente que en SolicitudesService: falta el endpoint en el MID.
    return of([]);
  }

  getMensajes(s: SolicitudRecibida): Observable<MensajeHilo[]> {
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
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const usuarioId = this.sesionSvc.sesion.usuarioId;
    if (usuarioId == null) return throwError(() => new Error('Sesión sin usuario local (JIT pendiente)'));
    return this.api.enviarMensaje(s.id, usuarioId, texto).pipe(
      switchMap(() => this.getMensajes(s)),
    );
  }

  /* ── Documentos de la solicitud (revisión y comentario de la empresa) ─── */

  /** Requeridos vs. subidos por el egresado, para revisar antes de responder. */
  getDocumentos(s: SolicitudRecibida): Observable<DocumentoSolicitudItem[]> {
    if (s.id == null) return of([]);
    return this.api.getDocumentosSolicitud(s.id).pipe(
      map(dtos => (dtos ?? []).map(mapDocumentoSolicitud)),
      catchError(() => of([] as DocumentoSolicitudItem[])),
    );
  }

  /** Observación de la empresa sobre un documento (campo único, se sobreescribe). */
  comentarDocumento(s: SolicitudRecibida, documentoSolicitudId: number, comentario: string):
    Observable<DocumentoSolicitudItem[]> {
    return this.api.comentarDocumento(documentoSolicitudId, comentario).pipe(
      switchMap(() => this.getDocumentos(s)),
    );
  }

  /** Base64 del PDF para verlo/descargarlo (proxy de solo lectura vía MID). */
  getArchivoDocumento(documentoSolicitudId: number): Observable<{ nombreArchivo: string; file: string }> {
    return this.api.getArchivoDocumento(documentoSolicitudId).pipe(
      map(dto => ({ nombreArchivo: dto.nombre_archivo, file: dto.file })),
    );
  }

  /* ── Beneficios publicados (RF-005) ────────────────────────── */

  /** Vista de gestión: TODOS los beneficios del dueño (cualquier estado) con
   *  métricas. Reactivo a la sesión: no emite hasta que el JIT resuelva el
   *  empresaId (el componente muestra skeleton mientras tanto). */
  getBeneficiosEmpresa(): Observable<BeneficioEmpresa[]> {
    return this.sesionSvc.sesion$.pipe(
      map(s => s.empresaId),
      distinctUntilChanged(),
      filter((empresaId): empresaId is number => empresaId != null),
      switchMap(empresaId => this.beneficiosSvc.categorias$.pipe(
        switchMap(cats => this.api.getBeneficiosEmpresa(empresaId).pipe(
          map(dtos => (dtos ?? []).map(d => mapBeneficioEmpresa(d, cats))),
        )),
      )),
    );
  }

  /** RF-005: publicar un beneficio. El MID exige empresa APROBADA (RN-008b). */
  publicar(form: FormPublicarBeneficio, empresa: Empresa): Observable<BeneficioEmpresa[]> {
    const { empresaId, usuarioId } = this.sesionSvc.sesion;
    if (empresaId == null) return throwError(() => new Error('Sesión sin empresa local (JIT pendiente)'));
    const categoriaId = Number(form.categoria);
    if (!categoriaId) return throwError(() => new Error('Selecciona la categoría del beneficio'));
    const documentosRequeridos = (form.documentosRequeridos ?? [])
      .filter(d => d.nombre.trim())
      .map(d => ({ nombre: d.nombre.trim(), descripcion: d.descripcion.trim() }));

    return this.api.publicarBeneficio(empresaId, {
      titulo: form.titulo.trim(),
      descripcion: form.resumen.trim(),
      condiciones: form.condiciones.trim(),
      categoria_beneficio_id: categoriaId,
      fecha_inicio: hoyLocalISO(),
      fecha_fin: form.vigenciaHasta,
      cupos_total: form.cuposIniciales,
      usuario_creador_id: usuarioId ?? undefined,
      documentos_requeridos: documentosRequeridos.length > 0 ? documentosRequeridos : undefined,
    }).pipe(
      // take(1): getBeneficiosEmpresa() es reactivo y no completa; basta la
      // primera lista fresca tras publicar.
      switchMap(() => this.getBeneficiosEmpresa().pipe(take(1))),
    );
  }
}
