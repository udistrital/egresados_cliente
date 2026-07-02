import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { Beneficio, BeneficioDetalle, categoriaColor, PerfilEmpresa } from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { BeneficiosService } from '../../core/services/beneficios.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { UsuarioSesion, UsuarioSesionService } from '../../core/services/usuario-sesion.service';

/**
 * Detalle de un beneficio · RF-003 (GET mid /v1/beneficios/:id vía fachada).
 */
@Component({
  selector: 'app-beneficio-detalle',
  templateUrl: './beneficio-detalle.component.html',
  styleUrls: ['./beneficio-detalle.component.scss'],
})
export class BeneficioDetalleComponent implements OnInit, OnDestroy {

  usuario: UsuarioSesion = this.sesionSvc.sesion;

  beneficio?: Beneficio;
  detalle?: BeneficioDetalle;
  /** Perfil público de la empresa (best-effort; la vista degrada si no llega) */
  perfilEmpresa?: PerfilEmpresa;
  modalAbierto = false;
  menuOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private autenticacion: ImplicitAutenticationService,
    private sesionSvc: UsuarioSesionService,
    private beneficiosSvc: BeneficiosService,
    private solicitudes: SolicitudesService,
  ) {}

  ngOnInit(): void {
    // Reaccionar al param para soportar navegación detalle → detalle
    this.route.paramMap
      .pipe(
        switchMap(params => this.beneficiosSvc.getDetalle(params.get('id') ?? '')),
        tap(({ beneficio, detalle }) => {
          this.beneficio = beneficio;
          this.detalle = detalle;
          this.perfilEmpresa = undefined;
        }),
        // "Acerca de la empresa" (best-effort tras cargar el beneficio)
        switchMap(({ beneficio }) => this.beneficiosSvc.getPerfilEmpresa(beneficio?.empresaId ?? 0)),
        takeUntil(this.destroy$),
      )
      .subscribe(perfil => (this.perfilEmpresa = perfil));

    // Caché de "mis solicitudes" para que yaSolicitado (RN-007) sea síncrono
    this.solicitudes.cargar()
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.sesionSvc.sesion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sesion => (this.usuario = sesion));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Estado del beneficio ─────────────────────────────────────
  get agotado(): boolean { return (this.beneficio?.cuposRestantes ?? 0) === 0; }
  get yaSolicitado(): boolean {
    return !!this.beneficio && this.solicitudes.yaSolicitado(this.beneficio.id);
  }
  get pctCupos(): number {
    if (!this.beneficio || this.beneficio.cuposIniciales === 0) return 0;
    return (this.beneficio.cuposRestantes / this.beneficio.cuposIniciales) * 100;
  }

  categoriaStyle(): Record<string, string> {
    const c = categoriaColor(this.beneficio?.categoria ?? '');
    return { background: c.bg, color: c.fg };
  }

  /** Tema visual del hero según la categoría (icono + clase de acento). */
  get tema(): { icon: string; cls: string } {
    const n = (this.beneficio?.categoria ?? '').toLowerCase();
    if (n.includes('salud') || n.includes('bienestar')) return { icon: 'favorite', cls: 'salud' };
    if (n.includes('tecno') || n.includes('digital'))   return { icon: 'memory', cls: 'tecnologia' };
    if (n.includes('educa') || n.includes('forma'))     return { icon: 'school', cls: 'formacion' };
    if (n.includes('cultura') || n.includes('recrea'))  return { icon: 'theater_comedy', cls: 'cultura' };
    if (n.includes('carrera') || n.includes('empleo'))  return { icon: 'work', cls: 'carrera' };
    if (n.includes('servicio') || n.includes('descuento') || n.includes('comercio'))
      return { icon: 'storefront', cls: 'servicios' };
    return { icon: 'redeem', cls: 'general' };
  }

  /** Días que faltan para el cierre (null si no hay fecha o ya venció). */
  get diasRestantes(): number | null {
    const iso = this.beneficio?.fechaFinIso;
    if (!iso) return null;
    const fin = new Date(iso).getTime();
    if (isNaN(fin)) return null;
    const dias = Math.ceil((fin - Date.now()) / 86_400_000);
    return dias >= 0 ? dias : null;
  }

  /** Social proof del beneficio ("N egresados ya lo solicitaron"). */
  get totalSolicitudes(): number {
    return this.beneficio?.totalSolicitudes ?? 0;
  }

  /** Condiciones como lista si vienen en varias líneas; [] = renderizar como párrafo. */
  get condicionesLista(): string[] {
    const texto = this.detalle?.condiciones ?? '';
    const items = texto
      .split(/\r?\n|(?:^|\s)[-•]\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    return items.length > 1 ? items : [];
  }

  /** "2025-01-15" → "2015" o fecha corta para "Aliado UD desde …". */
  get aliadoDesdeLabel(): string {
    const f = this.perfilEmpresa?.aliadoDesde;
    if (!f) return '';
    const anio = f.slice(0, 4);
    return /^\d{4}$/.test(anio) ? anio : f;
  }

  // ── Modal de solicitud ───────────────────────────────────────
  abrirModal(): void {
    if (!this.agotado && !this.yaSolicitado) this.modalAbierto = true;
  }
  onModalCerrado(creada: boolean): void {
    this.modalAbierto = false;
    // Refrescar cupos/estado tras crear la solicitud
    if (creada && this.beneficio) {
      this.beneficiosSvc.getDetalle(this.beneficio.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(({ beneficio, detalle }) => {
          this.beneficio = beneficio;
          this.detalle = detalle;
        });
    }
  }

  // ── Header ───────────────────────────────────────────────────
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { setTimeout(() => { this.menuOpen = false; }, 150); }
  logout(): void { this.autenticacion.logout('logout-manual'); }
}
