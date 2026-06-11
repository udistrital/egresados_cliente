import { Injectable } from '@angular/core';
import {
  Beneficio, Solicitud, HistorialEntrada, MensajeHilo,
  ESTADOS, SOLICITUDES_DEMO, HISTORIAL_DEMO, MENSAJES_DEMO,
} from '../../shared/oati.types';

export interface ResultadoSolicitud {
  ok: boolean;
  solicitud?: Solicitud;
  error?: string;
}

/**
 * Estado en memoria de las solicitudes del egresado para DEMO_MODE.
 * Replica las reglas de negocio que el MID aplica en POST /v1/solicitudes:
 *   RN-007  solicitud única por (egresado, beneficio) mientras no esté en estado final
 *   RN-010  límite de solicitudes activas
 *   RN-002b descuento de cupo al solicitar
 *   RN-RADICADO  radicado consecutivo BNF-YYYY-NNNNNN
 * En integración real este servicio se reemplaza por llamadas HTTP al MID.
 */
@Injectable({ providedIn: 'root' })
export class SolicitudesDemoService {
  /** RN-010 — en backend viene del parámetro LIMITE_SOLICITUDES_ACTIVAS_EGRESADO */
  readonly LIMITE_ACTIVAS = 5;

  private solicitudes: Solicitud[] = [...SOLICITUDES_DEMO];
  private consecutivo = 142; // siguiente número de la secuencia demo

  /* Bitácora y mensajes compartidos (en integración real: MID) */
  private historial = HISTORIAL_DEMO;
  private mensajes = MENSAJES_DEMO;

  getSolicitudes(): Solicitud[] {
    return this.solicitudes;
  }

  /** RN-007: hay una solicitud no-final (pendiente/revisión/info/aprobada) para el beneficio */
  yaSolicitado(beneficioId: string): boolean {
    return this.solicitudes.some(
      s => s.beneficioId === beneficioId &&
           s.estado !== 'rechazada' && s.estado !== 'cancelada',
    );
  }

  activasCount(): number {
    return this.solicitudes.filter(s => ESTADOS[s.estado]?.isActive).length;
  }

  limiteAlcanzado(): boolean {
    return this.activasCount() >= this.LIMITE_ACTIVAS;
  }

  /** datosComplementarios → en backend va al JSONB solicitud_beneficio.datos_complementarios */
  crearSolicitud(b: Beneficio, datosComplementarios?: string): ResultadoSolicitud {
    if (b.cuposRestantes <= 0) {
      return { ok: false, error: 'Este beneficio ya no tiene cupos disponibles.' };
    }
    if (this.yaSolicitado(b.id)) {
      return { ok: false, error: 'Ya tienes una solicitud en curso para este beneficio (RN-007).' };
    }
    if (this.limiteAlcanzado()) {
      return {
        ok: false,
        error: `Alcanzaste el límite de ${this.LIMITE_ACTIVAS} solicitudes activas (RN-010). ` +
               'Espera la respuesta de alguna o cancela una pendiente.',
      };
    }

    const radicado = `BNF-${new Date().getFullYear()}-${String(this.consecutivo++).padStart(6, '0')}`;
    b.cuposRestantes--; // RN-002b

    const solicitud: Solicitud = {
      radicado,
      beneficioId: b.id,
      beneficio: b.titulo,
      empresa: b.empresa,
      categoria: b.categoria,
      estado: 'pendiente',
      actualizada: 'Ahora',
      fechaSolicitud: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      cuposRestantes: b.cuposRestantes,
    };
    this.solicitudes = [solicitud, ...this.solicitudes];

    // C-4b: el estado inicial nace como primer registro del historial
    this.historial[radicado] = [
      { estadoNuevo: 'pendiente', actor: 'egresado', fecha: 'Ahora' },
    ];

    return { ok: true, solicitud };
  }

  /** RN-005: cancelar — el componente de solicitudes valida que el estado lo permita */
  cancelar(radicado: string): void {
    const anterior = this.solicitudes.find(s => s.radicado === radicado)?.estado;
    this.solicitudes = this.solicitudes.map(s =>
      s.radicado === radicado ? { ...s, estado: 'cancelada' as const, actualizada: 'Ahora' } : s,
    );
    this.historial[radicado] = [
      ...(this.historial[radicado] ?? []),
      {
        estadoAnterior: anterior,
        estadoNuevo: 'cancelada',
        actor: 'egresado',
        justificacion: 'Cancelada por el egresado.',
        fecha: 'Ahora',
      },
    ];
  }

  /* ── Historial y mensajes (RN-004, RF-007) ────────────────── */

  getHistorial(radicado: string): HistorialEntrada[] {
    return this.historial[radicado] ?? [];
  }

  getMensajes(radicado: string): MensajeHilo[] {
    return this.mensajes[radicado] ?? [];
  }

  /** El MID solo acepta mensajes mientras la solicitud está en REQUIERE_INFO */
  enviarMensaje(radicado: string, nombre: string, mensaje: string): void {
    this.mensajes[radicado] = [
      ...(this.mensajes[radicado] ?? []),
      { autor: 'egresado', nombre, mensaje, fecha: 'Ahora' },
    ];
  }
}
