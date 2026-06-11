import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { Beneficio, BeneficioDetalle, CATEGORIA_COLORS } from '../../shared/oati.types';
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
        takeUntil(this.destroy$),
      )
      .subscribe(({ beneficio, detalle }) => {
        this.beneficio = beneficio;
        this.detalle = detalle;
      });

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
    const c = CATEGORIA_COLORS[this.beneficio?.categoria ?? ''] ?? CATEGORIA_COLORS['Formación'];
    return { background: c.bg, color: c.fg };
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
