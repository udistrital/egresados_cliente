import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Solicitud, EstadoSolicitud,
  ESTADOS, SOLICITUDES_DEMO,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';

type FiltroEstado = 'todas' | 'activas' | 'aprobadas' | 'rechazadas' | 'canceladas';

interface UsuarioMenu {
  iniciales: string;
  primerNombre: string;
  rol: string;
  nombre: string;
  email: string;
  documento: string;
}

@Component({
  selector: 'app-solicitudes',
  templateUrl: './solicitudes.component.html',
  styleUrls: ['./solicitudes.component.scss'],
})
export class SolicitudesComponent implements OnInit, OnDestroy {

  usuario: UsuarioMenu = {
    iniciales: '…',
    primerNombre: 'Cargando…',
    rol: '',
    nombre: '',
    email: '',
    documento: '',
  };

  solicitudes: Solicitud[] = SOLICITUDES_DEMO;
  filtro: FiltroEstado = 'todas';
  query = '';
  menuOpen = false;

  readonly FILTROS: { value: FiltroEstado; label: string; icon: string }[] = [
    { value: 'todas',      label: 'Todas',      icon: 'list' },
    { value: 'activas',    label: 'Activas',    icon: 'hourglass_top' },
    { value: 'aprobadas',  label: 'Aprobadas',  icon: 'check_circle' },
    { value: 'rechazadas', label: 'Rechazadas', icon: 'cancel' },
    { value: 'canceladas', label: 'Canceladas', icon: 'close' },
  ];

  readonly ESTADOS = ESTADOS;

  private destroy$ = new Subject<void>();

  constructor(private autenticacion: ImplicitAutenticationService) {}

  ngOnInit(): void {
    this.autenticacion.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const { user, userService } = data;
        if (!user && !userService) return;

        const primerNombre: string = userService?.PrimerNombre ?? userService?.nombre ?? '';
        const primerApellido: string = userService?.PrimerApellido ?? userService?.apellido ?? '';
        const nombreCompleto = primerNombre && primerApellido
          ? `${primerNombre} ${primerApellido}`
          : primerNombre || user?.email || userService?.email || '';
        const email: string = userService?.email ?? userService?.Email ?? user?.email ?? '';
        const documento: string = userService?.documento ?? userService?.Documento ?? '';
        const tokens = nombreCompleto.trim().split(/\s+/);
        const iniciales = tokens.length >= 2
          ? (tokens[0][0] + tokens[1][0]).toUpperCase()
          : (nombreCompleto[0] ?? email[0] ?? '?').toUpperCase();
        const roles: string[] = userService?.role ?? user?.role ?? [];

        this.usuario = {
          iniciales,
          primerNombre: primerNombre || email.split('@')[0],
          nombre: nombreCompleto || email,
          email,
          documento,
          rol: roles[0] ?? 'Egresado',
        };
      });
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
    this.solicitudes = this.solicitudes.map(s =>
      s.radicado === radicado ? { ...s, estado: 'cancelada' as EstadoSolicitud } : s,
    );
  }

  puedeCancel(s: Solicitud): boolean { return s.estado === 'pendiente'; }

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
