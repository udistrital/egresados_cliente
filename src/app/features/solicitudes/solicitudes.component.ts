import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import {
  DocumentoSolicitudItem, Solicitud, EstadoSolicitud, HistorialEntrada, MensajeHilo,
  ESTADOS,
} from '../../shared/oati.types';
import { CertificadoService } from '../../core/services/certificado.service';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { UsuarioSesion, UsuarioSesionService } from '../../core/services/usuario-sesion.service';

type FiltroEstado = 'todas' | 'activas' | 'aprobadas' | 'rechazadas' | 'canceladas';

function base64ToBlob(base64: string, tipo = 'application/pdf'): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: tipo });
}

@Component({
  selector: 'app-solicitudes',
  templateUrl: './solicitudes.component.html',
  styleUrls: ['./solicitudes.component.scss'],
})
export class SolicitudesComponent implements OnInit, OnDestroy {

  usuario: UsuarioSesion = this.sesionSvc.sesion;

  solicitudes: Solicitud[] = [];
  /** true hasta la primera lista real (JIT + fetch); evita mostrar "sin
   *  solicitudes" mientras el backend aún no ha respondido. */
  cargandoSolicitudes = true;
  filtro: FiltroEstado = 'todas';
  query = '';
  menuOpen = false;

  /** Solicitud abierta en el drawer de detalle (null = cerrado) */
  drawer: Solicitud | null = null;
  nuevoMensaje = '';
  /** Bitácora y mensajes del drawer (se cargan al abrirlo) */
  private historialCache: HistorialEntrada[] = [];
  private mensajesCache: MensajeHilo[] = [];
  /** Documentos requeridos vs. subidos (se cargan al abrirlo) */
  documentosCache: DocumentoSolicitudItem[] = [];
  subiendoId: number | null = null;
  errorDocumentos: string | null = null;
  /** Comprobante OPCIONAL que la empresa adjuntó al aprobar (se carga al abrirlo, solo si aprobada) */
  comprobante: { tieneComprobante: boolean; nombreArchivo?: string; file?: string } | null = null;

  readonly FILTROS: { value: FiltroEstado; label: string; icon: string }[] = [
    { value: 'todas',      label: 'Todas',      icon: 'list' },
    { value: 'activas',    label: 'Activas',    icon: 'hourglass_top' },
    { value: 'aprobadas',  label: 'Aprobadas',  icon: 'check_circle' },
    { value: 'rechazadas', label: 'Rechazadas', icon: 'cancel' },
    { value: 'canceladas', label: 'Canceladas', icon: 'close' },
  ];

  readonly ESTADOS = ESTADOS;

  private destroy$ = new Subject<void>();

  /** Radicado llegado por query param (?radicado=BNF-…): abre el drawer al cargar.
   *  Deep-link usado por la flecha "Ver detalle" del dashboard. */
  private radicadoPendiente: string | null = null;

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private sesionSvc: UsuarioSesionService,
    private solicitudesSvc: SolicitudesService,
    private certificadoSvc: CertificadoService,
    private route: ActivatedRoute,
  ) {}

  /** Abre el certificado imprimible del beneficio otorgado (solo aprobadas). */
  verCertificado(): void {
    if (!this.drawer || this.drawer.estado !== 'aprobada') return;
    if (!this.certificadoSvc.abrir(this.drawer, this.usuario)) {
      alert('El navegador bloqueó la ventana del certificado. Permite las ventanas emergentes para este sitio.');
    }
  }

  ngOnInit(): void {
    this.radicadoPendiente = this.route.snapshot.queryParamMap.get('radicado');

    this.solicitudesSvc.cargar()
      .pipe(takeUntil(this.destroy$))
      .subscribe(solicitudes => {
        this.solicitudes = solicitudes;
        this.cargandoSolicitudes = false;
        this.abrirDetallePendiente();
      });

    // Tope de gracia: si el JIT de egresado falla, cargar() nunca emite —
    // soltar el skeleton y dejar que el estado vacío cuente la verdad.
    timer(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => (this.cargandoSolicitudes = false));

    this.sesionSvc.sesion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sesion => (this.usuario = sesion));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Contadores para los chips ────────────────────────────────
  count(f: FiltroEstado): number {
    if (f === 'todas')      return this.solicitudes.length;
    if (f === 'activas')    return this.solicitudes.filter(s => ESTADOS[s.estado]?.isActive).length;
    if (f === 'aprobadas')  return this.solicitudes.filter(s => s.estado === 'aprobada').length;
    if (f === 'rechazadas') return this.solicitudes.filter(s => s.estado === 'rechazada').length;
    if (f === 'canceladas') return this.solicitudes.filter(s => s.estado === 'cancelada').length;
    return 0;
  }

  get solicitudesFiltradas(): Solicitud[] {
    let arr = this.solicitudes;
    if (this.filtro === 'activas')    arr = arr.filter(s => ESTADOS[s.estado]?.isActive);
    if (this.filtro === 'aprobadas')  arr = arr.filter(s => s.estado === 'aprobada');
    if (this.filtro === 'rechazadas') arr = arr.filter(s => s.estado === 'rechazada');
    if (this.filtro === 'canceladas') arr = arr.filter(s => s.estado === 'cancelada');
    if (this.query.trim()) {
      const q = this.query.toLowerCase();
      arr = arr.filter(s =>
        s.beneficio.toLowerCase().includes(q) ||
        s.empresa.toLowerCase().includes(q) ||
        s.radicado.toLowerCase().includes(q),
      );
    }
    return arr;
  }

  setFiltro(f: FiltroEstado): void { this.filtro = f; }

  cancelarSolicitud(radicado: string): void {
    const solicitud = this.solicitudes.find(s => s.radicado === radicado);
    if (!solicitud) return;
    this.solicitudesSvc.cancelar(solicitud)
      .pipe(takeUntil(this.destroy$))
      .subscribe(solicitudes => {
        this.solicitudes = solicitudes;
        // Refrescar la referencia si el drawer muestra esta solicitud
        if (this.drawer?.radicado === radicado) {
          this.drawer = this.solicitudes.find(s => s.radicado === radicado) ?? null;
          if (this.drawer) this.cargarDetalleDrawer(this.drawer);
        }
      });
  }

  /** RN-005: cancelable mientras esté en curso (pendiente/requiere info/en revisión) */
  puedeCancel(s: Solicitud): boolean {
    return s.estado === 'pendiente' || s.estado === 'info' || s.estado === 'revision';
  }

  /* ── Drawer de detalle ───────────────────────────────────── */

  /** Abre el drawer de la solicitud pedida por query param, una sola vez. */
  private abrirDetallePendiente(): void {
    if (!this.radicadoPendiente) return;
    const s = this.solicitudes.find(x => x.radicado === this.radicadoPendiente);
    if (!s) return; // la lista aún puede estar vacía (JIT en curso); se reintenta al re-emitir
    this.radicadoPendiente = null;
    this.abrirDetalle(s);
  }

  abrirDetalle(s: Solicitud): void {
    this.drawer = s;
    this.nuevoMensaje = '';
    this.cargarDetalleDrawer(s);
  }

  private cargarDetalleDrawer(s: Solicitud): void {
    this.historialCache = [];
    this.mensajesCache = [];
    this.documentosCache = [];
    this.errorDocumentos = null;
    this.comprobante = null;
    this.solicitudesSvc.getHistorial(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(historial => (this.historialCache = historial));
    this.solicitudesSvc.getMensajes(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => (this.mensajesCache = mensajes));
    if (s.id != null) {
      this.solicitudesSvc.getDocumentos(s.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(documentos => (this.documentosCache = documentos));
    }
    // El comprobante solo existe si la empresa lo adjuntó al aprobar.
    if (s.estado === 'aprobada') {
      this.solicitudesSvc.getComprobante(s)
        .pipe(takeUntil(this.destroy$))
        .subscribe(c => (this.comprobante = c));
    }
  }

  verComprobante(): void {
    if (!this.comprobante?.file) return;
    const blob = base64ToBlob(this.comprobante.file);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  cerrarDetalle(): void { this.drawer = null; }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawer) this.cerrarDetalle();
  }

  get historialDrawer(): HistorialEntrada[] {
    return this.drawer ? this.historialCache : [];
  }

  get mensajesDrawer(): MensajeHilo[] {
    return this.drawer ? this.mensajesCache : [];
  }

  get documentosDrawer(): DocumentoSolicitudItem[] {
    return this.drawer ? this.documentosCache : [];
  }

  get comprobanteDrawer(): { tieneComprobante: boolean; nombreArchivo?: string; file?: string } | null {
    return this.drawer ? this.comprobante : null;
  }

  /** El hilo vive mientras la conversación está abierta: REQUIERE_INFO (te toca
   *  responder) o EN_REVISION (la empresa revisa tu respuesta) — regla del MID. */
  get puedeMensajear(): boolean {
    return this.drawer?.estado === 'info' || this.drawer?.estado === 'revision';
  }

  enviarMensaje(): void {
    if (!this.drawer || !this.puedeMensajear) return;
    const texto = this.nuevoMensaje.trim();
    if (!texto) return;
    const radicado = this.drawer.radicado;
    this.solicitudesSvc.enviarMensaje(this.drawer, this.usuario.nombre, texto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => {
        this.mensajesCache = mensajes;
        this.nuevoMensaje = '';
        // La respuesta del egresado puede mover el estado (REQUIERE_INFO →
        // EN_REVISION en el MID): recargar la lista y refrescar el drawer.
        this.solicitudesSvc.cargar()
          .pipe(take(1), takeUntil(this.destroy$))
          .subscribe(solicitudes => {
            this.solicitudes = solicitudes;
            if (this.drawer?.radicado === radicado) {
              this.drawer = solicitudes.find(x => x.radicado === radicado) ?? this.drawer;
            }
          });
      });
  }

  /* ── Documentos requeridos (drawer) ────────────────────────── */

  /** Solo se puede subir/reemplazar/quitar mientras la solicitud sigue en curso —
   *  mismo criterio que puedeCancel (el MID valida el estado igual, RN-005). */
  puedeGestionarDocumentos(): boolean {
    return !!this.drawer && this.puedeCancel(this.drawer);
  }

  onArchivoSeleccionado(item: DocumentoSolicitudItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.drawer?.id == null) return;

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
        .subirDocumento(this.drawer!.id!, item.documentoRequeridoId, file.name, base64)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: docs => { this.documentosCache = docs; this.subiendoId = null; },
          error: () => {
            this.errorDocumentos = 'No se pudo subir el documento. Intenta de nuevo.';
            this.subiendoId = null;
          },
        });
    };
    reader.readAsDataURL(file);
  }

  quitarDocumento(item: DocumentoSolicitudItem): void {
    if (this.drawer?.id == null || item.documentoSolicitudId == null) return;
    this.solicitudesSvc.eliminarDocumento(this.drawer.id, item.documentoSolicitudId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(docs => (this.documentosCache = docs));
  }

  verDocumento(item: DocumentoSolicitudItem): void {
    if (item.documentoSolicitudId == null) return;
    this.solicitudesSvc.getArchivoDocumento(item.documentoSolicitudId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ file }) => {
        const blob = base64ToBlob(file);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { setTimeout(() => { this.menuOpen = false; }, 150); }
  logout(): void { this.autenticacion.logout('logout-manual'); }

  badgeCls(estado: EstadoSolicitud): string {
    return `estado-badge estado-badge--${ESTADOS[estado]?.cls ?? 'pendiente'}`;
  }
  badgeIcon(estado: EstadoSolicitud): string {
    return ESTADOS[estado]?.icon ?? 'hourglass_empty';
  }
  badgeLabel(estado: EstadoSolicitud): string {
    return ESTADOS[estado]?.label ?? 'Pendiente';
  }
}
