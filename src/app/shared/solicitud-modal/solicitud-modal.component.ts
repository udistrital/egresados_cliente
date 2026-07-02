import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Beneficio, BeneficioDetalle, categoriaColor } from '../oati.types';
import { BeneficiosService } from '../../core/services/beneficios.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';

/**
 * Modal de confirmación de solicitud (RF-003).
 * Flujo: confirmar (leer condiciones, aceptar) → éxito (radicado BNF-YYYY-NNNNNN).
 * El confirmar dispara POST mid /v1/solicitudes a través de la fachada.
 */
@Component({
  selector: 'app-solicitud-modal',
  templateUrl: './solicitud-modal.component.html',
  styleUrls: ['./solicitud-modal.component.scss'],
})
export class SolicitudModalComponent implements OnInit {
  @Input({ required: true }) beneficio!: Beneficio;
  /** Emite true si la solicitud se creó (para que el caller refresque tarjetas). */
  @Output() cerrado = new EventEmitter<boolean>();

  detalle?: BeneficioDetalle;
  fase: 'confirmar' | 'exito' = 'confirmar';
  aceptaCondiciones = false;
  datosComplementarios = '';
  error: string | null = null;
  enviando = false;
  radicado = '';

  constructor(
    private beneficiosSvc: BeneficiosService,
    private solicitudesSvc: SolicitudesService,
  ) {}

  ngOnInit(): void {
    this.beneficiosSvc.getDetalle(this.beneficio.id)
      .subscribe(({ detalle }) => (this.detalle = detalle));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cerrar(); }

  cerrar(): void {
    this.cerrado.emit(this.fase === 'exito');
  }

  confirmar(): void {
    if (!this.aceptaCondiciones || this.enviando) return;
    this.enviando = true;
    this.error = null;

    // La fachada aplica (demo) o delega al MID (real) las RN-007/010/002b
    this.solicitudesSvc
      .crearSolicitud(this.beneficio, this.datosComplementarios.trim() || undefined)
      .subscribe(res => {
        this.enviando = false;
        if (!res.ok) {
          this.error = res.error ?? 'No se pudo crear la solicitud. Intenta de nuevo.';
          return;
        }
        this.radicado = res.solicitud?.radicado ?? '';
        this.fase = 'exito';
      });
  }

  categoriaStyle(): Record<string, string> {
    const c = categoriaColor(this.beneficio.categoria);
    return { background: c.bg, color: c.fg };
  }
}
