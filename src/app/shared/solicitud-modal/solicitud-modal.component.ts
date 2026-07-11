import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Beneficio, BeneficioDetalle, categoriaColor, DocumentoSolicitudItem } from '../oati.types';
import { BeneficiosService } from '../../core/services/beneficios.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';

function base64ToBlob(base64: string, tipo = 'application/pdf'): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: tipo });
}

/**
 * Modal de confirmación de solicitud (RF-003).
 * Flujo: confirmar (leer condiciones, aceptar) → [documentos, si el beneficio los
 * exige] → éxito (radicado BNF-YYYY-NNNNNN).
 * El confirmar dispara POST mid /v1/solicitudes a través de la fachada.
 */
@Component({
    selector: 'app-solicitud-modal',
    templateUrl: './solicitud-modal.component.html',
    styleUrls: ['./solicitud-modal.component.scss'],
    standalone: false
})
export class SolicitudModalComponent implements OnInit {
  @Input({ required: true }) beneficio!: Beneficio;
  /** Emite true si la solicitud se creó (para que el caller refresque tarjetas). */
  @Output() cerrado = new EventEmitter<boolean>();

  detalle?: BeneficioDetalle;
  fase: 'confirmar' | 'documentos' | 'exito' = 'confirmar';
  aceptaCondiciones = false;
  datosComplementarios = '';
  error: string | null = null;
  enviando = false;
  radicado = '';

  /* ── Documentos requeridos (fase 'documentos') ─────────────── */
  solicitudId?: number;
  documentos: DocumentoSolicitudItem[] = [];
  /** documentoRequeridoId con una subida en curso (null = ninguna) */
  subiendoId: number | null = null;
  errorDocumentos: string | null = null;

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
    this.cerrado.emit(this.fase === 'exito' || this.fase === 'documentos');
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
        this.solicitudId = res.solicitud?.id;

        // Si el beneficio exige documentos, se habilita su carga antes de cerrar;
        // si no exige ninguno, el flujo queda exactamente igual que antes.
        const requeridos = this.detalle?.documentosRequeridos ?? [];
        if (requeridos.length > 0 && this.solicitudId != null) {
          this.fase = 'documentos';
          this.cargarDocumentos(this.solicitudId);
        } else {
          this.fase = 'exito';
        }
      });
  }

  private cargarDocumentos(solicitudId: number): void {
    this.solicitudesSvc.getDocumentos(solicitudId).subscribe(docs => (this.documentos = docs));
  }

  /** Valida PDF y sube de inmediato (reemplaza si ya había uno subido para ese requisito). */
  onArchivoSeleccionado(item: DocumentoSolicitudItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo si algo falla

    if (!file || this.solicitudId == null) return;

    const esPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      this.errorDocumentos = 'Solo se permiten archivos PDF.';
      return;
    }
    this.errorDocumentos = null;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1];
      this.subiendoId = item.documentoRequeridoId;
      this.solicitudesSvc
        .subirDocumento(this.solicitudId!, item.documentoRequeridoId, file.name, base64)
        .subscribe({
          next: docs => { this.documentos = docs; this.subiendoId = null; },
          error: () => {
            this.errorDocumentos = 'No se pudo subir el documento. Intenta de nuevo.';
            this.subiendoId = null;
          },
        });
    };
    reader.readAsDataURL(file);
  }

  quitarDocumento(item: DocumentoSolicitudItem): void {
    if (this.solicitudId == null || item.documentoSolicitudId == null) return;
    this.solicitudesSvc.eliminarDocumento(this.solicitudId, item.documentoSolicitudId)
      .subscribe(docs => (this.documentos = docs));
  }

  verDocumento(item: DocumentoSolicitudItem): void {
    if (item.documentoSolicitudId == null) return;
    this.solicitudesSvc.getArchivoDocumento(item.documentoSolicitudId).subscribe(({ file }) => {
      const blob = base64ToBlob(file);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }

  finalizarDocumentos(): void {
    this.fase = 'exito';
  }

  categoriaStyle(): Record<string, string> {
    const c = categoriaColor(this.beneficio.categoria);
    return { background: c.bg, color: c.fg };
  }
}
