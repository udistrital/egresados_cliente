/* ============================================================
   Dashboard de Empresa · OATI Beneficios UD
   RF-006: bandeja de solicitudes recibidas
   RF-007: respuesta a solicitud (Aprobar / Rechazar / Info)
   ============================================================ */
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Empresa, SolicitudRecibida, EstadoSolicitud, HistorialEntrada, MensajeHilo,
  ESTADOS, EMPRESA_DEMO,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { AccionRespuesta, EmpresaService } from '../../core/services/empresa.service';

type FiltroEmpresa = 'todas' | 'pendientes' | 'en_revision' | 'aprobadas' | 'rechazadas';

interface RespuestaPanel {
  radicado: string;
  accion: AccionRespuesta;
  nota: string;
}

@Component({
  selector: 'app-empresa-dashboard',
  templateUrl: './empresa-dashboard.component.html',
  styleUrls: ['./empresa-dashboard.component.scss'],
})
export class EmpresaDashboardComponent implements OnInit, OnDestroy {

  empresa: Empresa = EMPRESA_DEMO;
  solicitudes: SolicitudRecibida[] = [];

  menuOpen = false;
  filtro: FiltroEmpresa = 'todas';
  query = '';

  /** Radicado de la fila con el panel de respuesta abierto */
  respuestaPanel: RespuestaPanel | null = null;

  /* ── Drawer de detalle ─────────────────────────────────── */
  /** Solicitud abierta en el drawer (null = cerrado) */
  drawer: SolicitudRecibida | null = null;
  drawerAccion: AccionRespuesta | null = null;
  drawerNota = '';
  drawerError: string | null = null;
  nuevoMensaje = '';
  /** Bitácora y mensajes del drawer (se cargan al abrirlo) */
  private historialCache: HistorialEntrada[] = [];
  private mensajesCache: MensajeHilo[] = [];

  /** RN-003 — en backend viene del parámetro JUSTIFICACION_RECHAZO_MIN_CARACTERES */
  readonly JUSTIFICACION_MIN = 20;

  readonly FILTROS: { value: FiltroEmpresa; label: string; icon: string }[] = [
    { value: 'todas',       label: 'Todas',        icon: 'list' },
    { value: 'pendientes',  label: 'Pendientes',   icon: 'hourglass_top' },
    { value: 'en_revision', label: 'En revisión',  icon: 'manage_search' },
    { value: 'aprobadas',   label: 'Aprobadas',    icon: 'check_circle' },
    { value: 'rechazadas',  label: 'Rechazadas',   icon: 'cancel' },
  ];

  readonly ESTADOS = ESTADOS;

  private destroy$ = new Subject<void>();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private empresaSvc: EmpresaService,
  ) {}

  ngOnInit(): void {
    this.empresaSvc.getEmpresa()
      .pipe(takeUntil(this.destroy$))
      .subscribe(empresa => (this.empresa = empresa));

    this.empresaSvc.getBandeja()
      .pipe(takeUntil(this.destroy$))
      .subscribe(solicitudes => (this.solicitudes = solicitudes));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Stats ─────────────────────────────────────────────── */
  get stats() {
    const s = this.solicitudes;
    return {
      pendientes: s.filter(x => x.estado === 'pendiente').length,
      revision:   s.filter(x => x.estado === 'revision').length,
      info:       s.filter(x => x.estado === 'info').length,
      aprobadas:  s.filter(x => x.estado === 'aprobada').length,
      rechazadas: s.filter(x => x.estado === 'rechazada').length,
      total:      s.length,
      activas:    s.filter(x => ESTADOS[x.estado]?.isActive).length,
    };
  }

  /* ── Lista filtrada ─────────────────────────────────────── */
  get solicitudesFiltradas(): SolicitudRecibida[] {
    let arr = this.solicitudes;
    if (this.filtro === 'pendientes')  arr = arr.filter(x => x.estado === 'pendiente');
    if (this.filtro === 'en_revision') arr = arr.filter(x => x.estado === 'revision' || x.estado === 'info');
    if (this.filtro === 'aprobadas')   arr = arr.filter(x => x.estado === 'aprobada');
    if (this.filtro === 'rechazadas')  arr = arr.filter(x => x.estado === 'rechazada');
    if (this.query.trim()) {
      const q = this.query.toLowerCase();
      arr = arr.filter(x =>
        x.egresado.toLowerCase().includes(q) ||
        x.beneficio.toLowerCase().includes(q) ||
        x.radicado.toLowerCase().includes(q) ||
        x.programa.toLowerCase().includes(q),
      );
    }
    return arr;
  }

  count(f: FiltroEmpresa): number {
    if (f === 'todas')       return this.solicitudes.length;
    if (f === 'pendientes')  return this.stats.pendientes;
    if (f === 'en_revision') return this.stats.revision + this.stats.info;
    if (f === 'aprobadas')   return this.stats.aprobadas;
    if (f === 'rechazadas')  return this.stats.rechazadas;
    return 0;
  }

  /* ── Acciones por solicitud ────────────────────────────── */
  puedeResponder(s: SolicitudRecibida): boolean {
    return s.estado === 'pendiente' || s.estado === 'revision' || s.estado === 'info';
  }

  abrirRespuesta(radicado: string, accion: AccionRespuesta): void {
    if (this.respuestaPanel?.radicado === radicado && this.respuestaPanel.accion === accion) {
      this.respuestaPanel = null;
      return;
    }
    this.respuestaPanel = { radicado, accion, nota: '' };
  }

  confirmarRespuesta(): void {
    if (!this.respuestaPanel) return;
    const { radicado, accion, nota } = this.respuestaPanel;
    this.aplicarRespuesta(radicado, accion, nota);
    this.respuestaPanel = null;
  }

  cancelarRespuesta(): void { this.respuestaPanel = null; }

  /**
   * Aplica la respuesta vía fachada: PUT mid /v1/solicitudes/:id/responder
   * (RN-003/004/005 las valida el MID; en demo se replican en EmpresaService).
   */
  private aplicarRespuesta(radicado: string, accion: AccionRespuesta, nota: string): void {
    const solicitud = this.solicitudes.find(s => s.radicado === radicado);
    if (!solicitud) return;

    this.empresaSvc.responder(solicitud, accion, nota)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: solicitudes => {
          this.solicitudes = solicitudes;
          // Si el drawer muestra esta solicitud, refrescar la referencia y su detalle
          if (this.drawer?.radicado === radicado) {
            this.drawer = this.solicitudes.find(s => s.radicado === radicado) ?? null;
            if (this.drawer) this.cargarDetalleDrawer(this.drawer);
          }
        },
        error: err => {
          this.drawerError = err?.error?.Message ?? err?.message ??
            'No se pudo aplicar la respuesta. Intenta de nuevo.';
        },
      });
  }

  /* ── Drawer de detalle ─────────────────────────────────── */

  abrirDetalle(s: SolicitudRecibida): void {
    this.drawer = s;
    this.drawerAccion = null;
    this.drawerNota = '';
    this.drawerError = null;
    this.nuevoMensaje = '';
    this.respuestaPanel = null;
    this.cargarDetalleDrawer(s);
  }

  private cargarDetalleDrawer(s: SolicitudRecibida): void {
    this.historialCache = [];
    this.mensajesCache = [];
    this.empresaSvc.getHistorial(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(historial => (this.historialCache = historial));
    this.empresaSvc.getMensajes(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => (this.mensajesCache = mensajes));
  }

  cerrarDetalle(): void {
    this.drawer = null;
    this.drawerAccion = null;
    this.drawerError = null;
  }

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

  seleccionarAccion(accion: AccionRespuesta): void {
    this.drawerAccion = this.drawerAccion === accion ? null : accion;
    this.drawerError = null;
  }

  confirmarDesdeDrawer(): void {
    if (!this.drawer || !this.drawerAccion) return;
    const nota = this.drawerNota.trim();

    // RN-003: justificación obligatoria y con mínimo de caracteres al rechazar
    if (this.drawerAccion === 'rechazar' && nota.length < this.JUSTIFICACION_MIN) {
      this.drawerError = `La justificación del rechazo debe tener al menos ${this.JUSTIFICACION_MIN} caracteres (RN-003).`;
      return;
    }
    if (this.drawerAccion === 'info' && !nota) {
      this.drawerError = 'Describe qué información necesitas del egresado.';
      return;
    }

    this.aplicarRespuesta(this.drawer.radicado, this.drawerAccion, nota);
    this.drawerAccion = null;
    this.drawerNota = '';
    this.drawerError = null;
  }

  /** Solo se puede conversar mientras la solicitud está en REQUIERE_INFO (regla del MID) */
  get puedeMensajear(): boolean {
    return this.drawer?.estado === 'info';
  }

  enviarMensaje(): void {
    if (!this.drawer || !this.puedeMensajear) return;
    const texto = this.nuevoMensaje.trim();
    if (!texto) return;

    this.empresaSvc.enviarMensaje(this.drawer, this.empresa.nombre, texto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => {
        this.mensajesCache = mensajes;
        this.nuevoMensaje = '';
      });
  }

  /* ── Badge helpers ─────────────────────────────────────── */
  badgeCls(estado: EstadoSolicitud): string {
    return `estado-badge estado-badge--${ESTADOS[estado]?.cls ?? 'pendiente'}`;
  }
  badgeIcon(estado: EstadoSolicitud): string {
    return ESTADOS[estado]?.icon ?? 'hourglass_empty';
  }
  badgeLabel(estado: EstadoSolicitud): string {
    return ESTADOS[estado]?.label ?? 'Pendiente';
  }

  /* ── Menu / sesión ─────────────────────────────────────── */
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void  { setTimeout(() => { this.menuOpen = false; }, 150); }
  logout(): void     { this.autenticacion.logout('logout-manual'); }

  setFiltro(f: FiltroEmpresa): void {
    this.filtro = f;
    this.respuestaPanel = null;
  }
}
