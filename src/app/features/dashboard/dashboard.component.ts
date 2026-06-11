import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Solicitud, EstadoSolicitud, ESTADOS, Beneficio } from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { BeneficiosService } from '../../core/services/beneficios.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { UsuarioSesion, UsuarioSesionService } from '../../core/services/usuario-sesion.service';

interface Banner {
  tipo: 'atencion' | 'proceso' | 'ok' | 'vacio';
  icon: string;
  texto: string;
  cta: string | null;
  ctaRuta: string | null;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly LIMITE_ACTIVAS = this.solicitudesSvc.LIMITE_ACTIVAS;

  BENEFICIOS_NOVEDAD: Beneficio[] = [];

  usuario: UsuarioSesion & { saludo: string } = {
    ...this.sesionSvc.sesion,
    saludo: this.buildSaludo(),
  };

  solicitudes: Solicitud[] = [];
  menuOpen = false;

  readonly ESTADOS = ESTADOS;

  private destroy$ = new Subject<void>();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private sesionSvc: UsuarioSesionService,
    private beneficiosSvc: BeneficiosService,
    private solicitudesSvc: SolicitudesService,
  ) {}

  ngOnInit(): void {
    this.sesionSvc.sesion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sesion => (this.usuario = { ...sesion, saludo: this.buildSaludo() }));

    this.solicitudesSvc.cargar()
      .pipe(takeUntil(this.destroy$))
      .subscribe(solicitudes => (this.solicitudes = solicitudes));

    this.beneficiosSvc.getCatalogo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(beneficios => (this.BENEFICIOS_NOVEDAD = beneficios.slice(0, 3)));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Saludo según hora ────────────────────────────────────────
  private buildSaludo(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  // ── Banner contextual ────────────────────────────────────────
  get banner(): Banner {
    const info = this.solicitudes.filter(s => s.estado === 'info');
    const activas = this.solicitudes.filter(s => ESTADOS[s.estado]?.isActive);

    if (info.length > 0) {
      const n = info.length;
      return {
        tipo: 'atencion',
        icon: 'info',
        texto: `Tienes ${n} solicitud${n > 1 ? 'es' : ''} que requiere${n > 1 ? 'n' : ''} información adicional de tu parte.`,
        cta: 'Revisar ahora',
        ctaRuta: null,
      };
    }
    if (activas.length > 0) {
      return {
        tipo: 'proceso',
        icon: 'hourglass_top',
        texto: `Tienes ${activas.length} solicitud${activas.length > 1 ? 'es' : ''} en proceso · las empresas están revisando.`,
        cta: null,
        ctaRuta: null,
      };
    }
    if (this.solicitudes.length === 0) {
      return {
        tipo: 'vacio',
        icon: 'rocket_launch',
        texto: 'Aún no tienes solicitudes. Empieza explorando los beneficios disponibles para egresados UD.',
        cta: 'Ver catálogo',
        ctaRuta: '/catalogo',
      };
    }
    return {
      tipo: 'ok',
      icon: 'check_circle',
      texto: 'Todo al día. No tienes solicitudes pendientes de atención en este momento.',
      cta: 'Explorar novedades',
      ctaRuta: '/catalogo',
    };
  }

  // ── Solicitudes recientes (inicio) ──────────────────────────
  get solicitudesRecientes(): Solicitud[] {
    // Priorizar las que requieren atención, luego las más activas
    const conAccion = this.solicitudes.filter(s => s.estado === 'info');
    const resto = this.solicitudes
      .filter(s => ESTADOS[s.estado]?.isActive && s.estado !== 'info')
      .slice(0, 3 - conAccion.length);
    return [...conAccion, ...resto].slice(0, 3);
  }

  get haySolicitudesActivas(): boolean {
    return this.solicitudes.some(s => ESTADOS[s.estado]?.isActive);
  }

  get activasCount(): number {
    return this.solicitudes.filter(s => ESTADOS[s.estado]?.isActive).length;
  }

  get activasPct(): number {
    return (this.activasCount / this.LIMITE_ACTIVAS) * 100;
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

  categoriaIniciales(b: Beneficio): string {
    return b.empresa.slice(0, 1).toUpperCase();
  }
}
