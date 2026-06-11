import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Solicitud, EstadoSolicitud, HistorialEntrada, MensajeHilo,
  ESTADOS,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { UsuarioSesion, UsuarioSesionService } from '../../core/services/usuario-sesion.service';

type FiltroEstado = 'todas' | 'activas' | 'aprobadas' | 'rechazadas' | 'canceladas';

@Component({
  selector: 'app-solicitudes',
  templateUrl: './solicitudes.component.html',
  styleUrls: ['./solicitudes.component.scss'],
})
export class SolicitudesComponent implements OnInit, OnDestroy {

  usuario: UsuarioSesion = this.sesionSvc.sesion;

  solicitudes: Solicitud[] = [];
  filtro: FiltroEstado = 'todas';
  query = '';
  menuOpen = false;

  /** Solicitud abierta en el drawer de detalle (null = cerrado) */
  drawer: Solicitud | null = null;
  nuevoMensaje = '';
  /** Bitácora y mensajes del drawer (se cargan al abrirlo) */
  private historialCache: HistorialEntrada[] = [];
  private mensajesCache: MensajeHilo[] = [];

  readonly FILTROS: { value: FiltroEstado; label: string; icon: string }[] = [
    { value: 'todas',      label: 'Todas',      icon: 'list' },
    { value: 'activas',    label: 'Activas',    icon: 'hourglass_top' },
    { value: 'aprobadas',  label: 'Aprobadas',  icon: 'check_circle' },
    { value: 'rechazadas', label: 'Rechazadas', icon: 'cancel' },
    { value: 'canceladas', label: 'Canceladas', icon: 'close' },
  ];

  readonly ESTADOS = ESTADOS;

  private destroy$ = new Subject<void>();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private sesionSvc: UsuarioSesionService,
    private solicitudesSvc: SolicitudesService,
  ) {}

  ngOnInit(): void {
    this.solicitudesSvc.cargar()
      .pipe(takeUntil(this.destroy$))
      .subscribe(solicitudes => (this.solicitudes = solicitudes));

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

  puedeCancel(s: Solicitud): boolean { return s.estado === 'pendiente'; }

  /* ── Drawer de detalle ───────────────────────────────────── */

  abrirDetalle(s: Solicitud): void {
    this.drawer = s;
    this.nuevoMensaje = '';
    this.cargarDetalleDrawer(s);
  }

  private cargarDetalleDrawer(s: Solicitud): void {
    this.historialCache = [];
    this.mensajesCache = [];
    this.solicitudesSvc.getHistorial(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(historial => (this.historialCache = historial));
    this.solicitudesSvc.getMensajes(s)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => (this.mensajesCache = mensajes));
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

  /** Solo se puede conversar mientras la solicitud está en REQUIERE_INFO (regla del MID) */
  get puedeMensajear(): boolean {
    return this.drawer?.estado === 'info';
  }

  enviarMensaje(): void {
    if (!this.drawer || !this.puedeMensajear) return;
    const texto = this.nuevoMensaje.trim();
    if (!texto) return;
    this.solicitudesSvc.enviarMensaje(this.drawer, this.usuario.nombre, texto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(mensajes => {
        this.mensajesCache = mensajes;
        this.nuevoMensaje = '';
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
