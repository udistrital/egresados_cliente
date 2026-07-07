/* ============================================================
   Fachada de solicitudes del egresado (RF-003/008/013) contra el
   MID real. Mantiene una caché local para que las lecturas
   síncronas que usan los templates (yaSolicitado, limiteAlcanzado,
   contadores) sigan funcionando igual.
   ============================================================ */
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, take, tap } from 'rxjs/operators';
import {
  Beneficio, DocumentoSolicitudItem, ESTADOS, HistorialEntrada, MensajeHilo, Solicitud,
} from '../../shared/oati.types';
import { BeneficiosMidService } from '../api/beneficios-mid.service';
import { mapDocumentoSolicitud, mapMensaje, mapSolicitud, ordenarSolicitudesRecientes } from '../api/mappers';
import { BeneficiosService } from './beneficios.service';
import { UsuarioSesionService } from './usuario-sesion.service';

export interface ResultadoSolicitud {
  ok: boolean;
  solicitud?: Solicitud;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {

  /** RN-010 — en backend es el parámetro LIMITE_SOLIC_ACTIVAS */
  readonly LIMITE_ACTIVAS = 5;

  /** Caché de "mis solicitudes" para las lecturas síncronas de los templates */
  private cache: Solicitud[] = [];

  constructor(
    private api: BeneficiosMidService,
    private beneficiosSvc: BeneficiosService,
    private sesionSvc: UsuarioSesionService,
  ) {}

  /* ── Carga y lecturas síncronas ────────────────────────────── */

  /** RF-008: carga (o recarga) mis solicitudes con su estado vigente (C-4b).
   *  Reactivo a la sesión y NO emite mientras el JIT provisioning no resuelva el
   *  egresadoId: emitir [] en esa fase hacía que las vistas mostraran "sin
   *  solicitudes" (información errónea) — muestran skeleton hasta la primera
   *  emisión real. */
  cargar(): Observable<Solicitud[]> {
    return this.sesionSvc.sesion$.pipe(
      map(s => s.egresadoId),
      distinctUntilChanged(),
      filter((egresadoId): egresadoId is number => egresadoId != null),
      switchMap(egresadoId => this.beneficiosSvc.categorias$.pipe(
        switchMap(cats => this.api.getSolicitudesEgresado(egresadoId).pipe(
          map(dtos => ordenarSolicitudesRecientes(dtos ?? []).map(d => mapSolicitud(d, cats))),
        )),
      )),
      tap(solicitudes => (this.cache = solicitudes)),
    );
  }

  getSolicitudes(): Solicitud[] {
    return this.cache;
  }

  /** RN-007: ya hay una solicitud no-final para el beneficio. */
  yaSolicitado(beneficioId: string): boolean {
    return this.cache.some(
      s => s.beneficioId === beneficioId && !ESTADOS[s.estado]?.isFinal,
    );
  }

  activasCount(): number {
    return this.cache.filter(s => ESTADOS[s.estado]?.isActive).length;
  }

  /** RN-010 */
  limiteAlcanzado(): boolean {
    return this.activasCount() >= this.LIMITE_ACTIVAS;
  }

  /* ── Mutaciones ────────────────────────────────────────────── */

  /** RF-003: crear solicitud. El MID aplica RN-007/010/002b y genera el radicado. */
  crearSolicitud(b: Beneficio, datosComplementarios?: string): Observable<ResultadoSolicitud> {
    const { egresadoId, usuarioId } = this.sesionSvc.sesion;
    if (egresadoId == null) {
      return of({ ok: false, error: 'Tu perfil de egresado aún no está habilitado en el módulo.' });
    }
    return this.api.crearSolicitud({
      egresado_id: egresadoId,
      beneficio_id: Number(b.id),
      datos_complementarios: datosComplementarios,
      usuario_id: usuarioId ?? undefined,
    }).pipe(
      // El MID devuelve solo { id }: recargar para obtener radicado y estado.
      // take(1): cargar() es reactivo a la sesión y no completa; aquí basta la
      // primera lista fresca (el egresadoId ya está resuelto en este punto).
      switchMap(res => this.cargar().pipe(
        take(1),
        map(solicitudes => {
          const creada = solicitudes.find(s => s.id === res.id);
          return creada
            ? { ok: true, solicitud: creada }
            : { ok: true, solicitud: undefined };
        }),
      )),
      catchError(err => of({ ok: false, error: mensajeDeError(err) })),
    );
  }

  /** RF-008 / RN-005: cancelar (solo PENDIENTE o REQUIERE_INFO). Devuelve la lista actualizada. */
  cancelar(s: Solicitud): Observable<Solicitud[]> {
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const usuarioId = this.sesionSvc.sesion.usuarioId ?? undefined;
    return this.api.cancelarSolicitud(s.id, usuarioId).pipe(switchMap(() => this.cargar().pipe(take(1))));
  }

  /* ── Bitácora y mensajes (drawer de detalle) ───────────────── */

  getHistorial(s: Solicitud): Observable<HistorialEntrada[]> {
    if (s.id == null) return of([]);
    // El MID aún no expone /solicitudes/:id/historial (ver BeneficiosMidService):
    // degradar a vacío hasta que se agregue al retomar el backend.
    return this.api.getHistorial(s.id).pipe(
      map(() => [] as HistorialEntrada[]),
      catchError(() => of([] as HistorialEntrada[])),
    );
  }

  getMensajes(s: Solicitud): Observable<MensajeHilo[]> {
    if (s.id == null) return of([]);
    const propio = this.sesionSvc.sesion.usuarioId;
    return this.api.getMensajes(s.id).pipe(
      map(dtos => (dtos ?? []).map(d =>
        mapMensaje(d, uid => (uid != null && uid === propio ? 'egresado' : 'empresa')))),
      catchError(() => of([] as MensajeHilo[])),
    );
  }

  /** RF-007: enviar mensaje (el MID solo lo acepta en REQUIERE_INFO). */
  enviarMensaje(s: Solicitud, nombre: string, texto: string): Observable<MensajeHilo[]> {
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const usuarioId = this.sesionSvc.sesion.usuarioId;
    if (usuarioId == null) return throwError(() => new Error('Sesión sin usuario local (JIT pendiente)'));
    return this.api.enviarMensaje(s.id, usuarioId, texto).pipe(
      switchMap(() => this.getMensajes(s)),
    );
  }

  /* ── Documentos requeridos de la solicitud (subida por el egresado) ───── */

  /** Requeridos vs. subidos: qué le falta al egresado y qué ya envió. */
  getDocumentos(solicitudId: number): Observable<DocumentoSolicitudItem[]> {
    return this.api.getDocumentosSolicitud(solicitudId).pipe(
      map(dtos => (dtos ?? []).map(mapDocumentoSolicitud)),
      catchError(() => of([] as DocumentoSolicitudItem[])),
    );
  }

  /** Sube (o reemplaza) el PDF de un documento requerido. Solo mientras la
   *  solicitud sigue en curso (el MID valida el estado, RN-005). */
  subirDocumento(solicitudId: number, documentoRequeridoId: number, nombreArchivo: string, fileBase64: string):
    Observable<DocumentoSolicitudItem[]> {
    return this.api.subirDocumentoSolicitud(solicitudId, {
      documento_requerido_id: documentoRequeridoId, nombre_archivo: nombreArchivo, file: fileBase64,
    }).pipe(switchMap(() => this.getDocumentos(solicitudId)));
  }

  /** Quita un documento ya subido. */
  eliminarDocumento(solicitudId: number, documentoSolicitudId: number): Observable<DocumentoSolicitudItem[]> {
    return this.api.eliminarDocumentoSolicitud(solicitudId, documentoSolicitudId).pipe(
      switchMap(() => this.getDocumentos(solicitudId)),
    );
  }

  /** Base64 del PDF para verlo/descargarlo (proxy de solo lectura vía MID). */
  getArchivoDocumento(documentoSolicitudId: number): Observable<{ nombreArchivo: string; file: string }> {
    return this.api.getArchivoDocumento(documentoSolicitudId).pipe(
      map(dto => ({ nombreArchivo: dto.nombre_archivo, file: dto.file })),
    );
  }

  /** Comprobante OPCIONAL que la empresa adjuntó al aprobar (tieneComprobante=false
   *  si no adjuntó nada, caso normal — no es un error). */
  getComprobante(s: Solicitud): Observable<{ tieneComprobante: boolean; nombreArchivo?: string; file?: string }> {
    if (s.id == null) return of({ tieneComprobante: false });
    return this.api.getComprobanteSolicitud(s.id).pipe(
      map(dto => ({ tieneComprobante: dto.tiene_comprobante, nombreArchivo: dto.nombre_archivo, file: dto.file })),
      catchError(() => of({ tieneComprobante: false })),
    );
  }
}

function mensajeDeError(err: unknown): string {
  const e = err as { error?: { Message?: string }; message?: string };
  return e?.error?.Message ?? e?.message ?? 'No se pudo crear la solicitud. Intenta de nuevo.';
}
