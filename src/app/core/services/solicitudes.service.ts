/* ============================================================
   Fachada de solicitudes del egresado (RF-003/008/013).
   DEMO_MODE=true  → delega en SolicitudesDemoService (estado en
                     memoria compartido entre vistas).
   DEMO_MODE=false → MID real. Mantiene una caché local para que
   las lecturas síncronas que usan los templates (yaSolicitado,
   limiteAlcanzado, contadores) sigan funcionando igual.
   ============================================================ */
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Beneficio, ESTADOS, HistorialEntrada, MensajeHilo, Solicitud,
} from '../../shared/oati.types';
import { BeneficiosMidService } from '../api/beneficios-mid.service';
import { mapMensaje, mapSolicitud } from '../api/mappers';
import { BeneficiosService } from './beneficios.service';
import { ResultadoSolicitud, SolicitudesDemoService } from './solicitudes-demo.service';
import { UsuarioSesionService } from './usuario-sesion.service';

export { ResultadoSolicitud } from './solicitudes-demo.service';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {

  /** RN-010 — en backend es el parámetro LIMITE_SOLICITUDES_ACTIVAS_EGRESADO */
  readonly LIMITE_ACTIVAS = 5;

  /** Caché de "mis solicitudes" para las lecturas síncronas de los templates */
  private cache: Solicitud[] = [];

  constructor(
    private api: BeneficiosMidService,
    private demo: SolicitudesDemoService,
    private beneficiosSvc: BeneficiosService,
    private sesionSvc: UsuarioSesionService,
  ) {}

  /* ── Carga y lecturas síncronas ────────────────────────────── */

  /** RF-008: carga (o recarga) mis solicitudes con su estado vigente (C-4b). */
  cargar(): Observable<Solicitud[]> {
    if (environment.DEMO_MODE) {
      this.cache = this.demo.getSolicitudes();
      return of(this.cache);
    }
    const egresadoId = this.sesionSvc.sesion.egresadoId;
    if (egresadoId == null) {
      // JIT provisioning pendiente en el MID: sin id local no hay consulta posible
      this.cache = [];
      return of(this.cache);
    }
    return this.beneficiosSvc.categorias$.pipe(
      switchMap(cats => this.api.getSolicitudesEgresado(egresadoId).pipe(
        map(dtos => (dtos ?? []).map(d => mapSolicitud(d, cats))),
      )),
      tap(solicitudes => (this.cache = solicitudes)),
    );
  }

  getSolicitudes(): Solicitud[] {
    return environment.DEMO_MODE ? this.demo.getSolicitudes() : this.cache;
  }

  /** RN-007: ya hay una solicitud no-final para el beneficio. */
  yaSolicitado(beneficioId: string): boolean {
    if (environment.DEMO_MODE) return this.demo.yaSolicitado(beneficioId);
    return this.cache.some(
      s => s.beneficioId === beneficioId && !ESTADOS[s.estado]?.isFinal,
    );
  }

  activasCount(): number {
    if (environment.DEMO_MODE) return this.demo.activasCount();
    return this.cache.filter(s => ESTADOS[s.estado]?.isActive).length;
  }

  /** RN-010 */
  limiteAlcanzado(): boolean {
    return this.activasCount() >= this.LIMITE_ACTIVAS;
  }

  /* ── Mutaciones ────────────────────────────────────────────── */

  /** RF-003: crear solicitud. El MID aplica RN-007/010/002b y genera el radicado. */
  crearSolicitud(b: Beneficio, datosComplementarios?: string): Observable<ResultadoSolicitud> {
    if (environment.DEMO_MODE) {
      return of(this.demo.crearSolicitud(b, datosComplementarios));
    }
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
      // TODO backend: que POST /v1/solicitudes retorne también el radicado.
      switchMap(res => this.cargar().pipe(
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
    if (environment.DEMO_MODE) {
      this.demo.cancelar(s.radicado);
      this.cache = this.demo.getSolicitudes();
      return of(this.cache);
    }
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const usuarioId = this.sesionSvc.sesion.usuarioId ?? undefined;
    return this.api.cancelarSolicitud(s.id, usuarioId).pipe(switchMap(() => this.cargar()));
  }

  /* ── Bitácora y mensajes (drawer de detalle) ───────────────── */

  getHistorial(s: Solicitud): Observable<HistorialEntrada[]> {
    if (environment.DEMO_MODE) return of(this.demo.getHistorial(s.radicado));
    if (s.id == null) return of([]);
    // El MID aún no expone /solicitudes/:id/historial (ver BeneficiosMidService):
    // degradar a vacío hasta que se agregue al retomar el backend.
    return this.api.getHistorial(s.id).pipe(
      map(() => [] as HistorialEntrada[]),
      catchError(() => of([] as HistorialEntrada[])),
    );
  }

  getMensajes(s: Solicitud): Observable<MensajeHilo[]> {
    if (environment.DEMO_MODE) return of(this.demo.getMensajes(s.radicado));
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
    if (environment.DEMO_MODE) {
      this.demo.enviarMensaje(s.radicado, nombre, texto);
      return of(this.demo.getMensajes(s.radicado));
    }
    if (s.id == null) return throwError(() => new Error('La solicitud no tiene id de backend'));
    const usuarioId = this.sesionSvc.sesion.usuarioId;
    if (usuarioId == null) return throwError(() => new Error('Sesión sin usuario local (JIT pendiente)'));
    return this.api.enviarMensaje(s.id, usuarioId, texto).pipe(
      switchMap(() => this.getMensajes(s)),
    );
  }
}

function mensajeDeError(err: unknown): string {
  const e = err as { error?: { Message?: string }; message?: string };
  return e?.error?.Message ?? e?.message ?? 'No se pudo crear la solicitud. Intenta de nuevo.';
}
