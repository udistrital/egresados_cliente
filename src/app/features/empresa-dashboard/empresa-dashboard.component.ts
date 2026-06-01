/* ============================================================
   Dashboard de Empresa · OATI Beneficios UD
   RF-006: bandeja de solicitudes recibidas
   RF-007: respuesta a solicitud (Aprobar / Rechazar / Info)
   ============================================================ */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Empresa, SolicitudRecibida, EstadoSolicitud,
  ESTADOS, EMPRESA_DEMO, SOLICITUDES_EMPRESA_DEMO,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';

type FiltroEmpresa = 'todas' | 'pendientes' | 'en_revision' | 'aprobadas' | 'rechazadas';

interface RespuestaPanel {
  radicado: string;
  accion: 'aprobar' | 'rechazar' | 'info';
  nota: string;
}

@Component({
  selector: 'app-empresa-dashboard',
  templateUrl: './empresa-dashboard.component.html',
  styleUrls: ['./empresa-dashboard.component.scss'],
})
export class EmpresaDashboardComponent implements OnInit, OnDestroy {

  empresa: Empresa = EMPRESA_DEMO;
  solicitudes: SolicitudRecibida[] = [...SOLICITUDES_EMPRESA_DEMO];

  menuOpen = false;
  filtro: FiltroEmpresa = 'todas';
  query = '';

  /** Radicado de la fila con el panel de respuesta abierto */
  respuestaPanel: RespuestaPanel | null = null;

  readonly FILTROS: { value: FiltroEmpresa; label: string; icon: string }[] = [
    { value: 'todas',       label: 'Todas',        icon: 'list' },
    { value: 'pendientes',  label: 'Pendientes',   icon: 'hourglass_top' },
    { value: 'en_revision', label: 'En revisión',  icon: 'manage_search' },
    { value: 'aprobadas',   label: 'Aprobadas',    icon: 'check_circle' },
    { value: 'rechazadas',  label: 'Rechazadas',   icon: 'cancel' },
  ];

  readonly ESTADOS = ESTADOS;

  private destroy$ = new Subject<void>();

  constructor(private autenticacion: ImplicitAutenticationService) {}

  ngOnInit(): void {
    /* En integración real se leerá empresa y solicitudes desde el servicio MID */
    this.autenticacion.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const { user, userService } = data;
        if (!user && !userService) return;
        /* Aquí se actualizaría this.empresa con los datos del token */
      });
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

  abrirRespuesta(radicado: string, accion: 'aprobar' | 'rechazar' | 'info'): void {
    if (this.respuestaPanel?.radicado === radicado && this.respuestaPanel.accion === accion) {
      this.respuestaPanel = null;
      return;
    }
    this.respuestaPanel = { radicado, accion, nota: '' };
  }

  confirmarRespuesta(): void {
    if (!this.respuestaPanel) return;
    const { radicado, accion, nota } = this.respuestaPanel;

    const nuevoEstado: EstadoSolicitud =
      accion === 'aprobar'  ? 'aprobada'  :
      accion === 'rechazar' ? 'rechazada' : 'info';

    this.solicitudes = this.solicitudes.map(s =>
      s.radicado === radicado
        ? { ...s, estado: nuevoEstado, actualizada: 'Ahora', nota: nota || undefined }
        : s,
    );
    this.respuestaPanel = null;
  }

  cancelarRespuesta(): void { this.respuestaPanel = null; }

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
