/* ============================================================
   Gestión de Beneficios de Empresa · OATI Beneficios UD
   RF-005: publicación de beneficios (solo empresas aprobadas)
   ============================================================ */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Empresa, BeneficioEmpresa, CategoriaBeneficio,
  CATEGORIA_COLORS, EMPRESA_DEMO,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { EmpresaService, FormPublicarBeneficio } from '../../core/services/empresa.service';

@Component({
  selector: 'app-empresa-beneficios',
  templateUrl: './empresa-beneficios.component.html',
  styleUrls: ['./empresa-beneficios.component.scss'],
})
export class EmpresaBeneficiosComponent implements OnInit, OnDestroy {

  empresa: Empresa = EMPRESA_DEMO;
  beneficios: BeneficioEmpresa[] = [];

  menuOpen = false;
  mostrarFormulario = false;
  publicando = false;

  readonly CATEGORIA_COLORS = CATEGORIA_COLORS;

  readonly CATEGORIAS: { value: CategoriaBeneficio; label: string }[] = [
    { value: 'Formación',  label: 'Formación' },
    { value: 'Carrera',    label: 'Carrera' },
    { value: 'Servicios',  label: 'Servicios' },
    { value: 'Salud',      label: 'Salud' },
    { value: 'Cultura',    label: 'Cultura' },
  ];

  form: FormPublicarBeneficio = this.formVacio();

  private destroy$ = new Subject<void>();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private empresaSvc: EmpresaService,
  ) {}

  ngOnInit(): void {
    this.empresaSvc.getEmpresa()
      .pipe(takeUntil(this.destroy$))
      .subscribe(empresa => (this.empresa = empresa));

    this.empresaSvc.getBeneficiosEmpresa()
      .pipe(takeUntil(this.destroy$))
      .subscribe(beneficios => (this.beneficios = beneficios));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Stats rápidas ─────────────────────────────────────── */
  get statsGlobales() {
    return {
      activos:    this.beneficios.filter(b => b.estadoPublicacion === 'activo').length,
      agotados:   this.beneficios.filter(b => b.estadoPublicacion === 'agotado').length,
      vencidos:   this.beneficios.filter(b => b.estadoPublicacion === 'vencido').length,
      solicitudes: this.beneficios.reduce((acc, b) => acc + b.solicitudesRecibidas, 0),
      pendientes:  this.beneficios.reduce((acc, b) => acc + b.solicitudesPendientes, 0),
    };
  }

  /* ── Publicar formulario ───────────────────────────────── */
  private formVacio(): FormPublicarBeneficio {
    return { titulo: '', categoria: '', cuposIniciales: null, vigenciaHasta: '', resumen: '' };
  }

  get formValido(): boolean {
    const f = this.form;
    return !!(
      f.titulo.trim() &&
      f.categoria &&
      f.cuposIniciales && f.cuposIniciales > 0 &&
      f.vigenciaHasta &&
      f.resumen.trim()
    );
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) this.form = this.formVacio();
  }

  publicar(): void {
    if (!this.formValido || this.form.categoria === '' || this.publicando) return;
    this.publicando = true;
    this.empresaSvc.publicar(this.form, this.empresa)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: beneficios => {
          this.beneficios = beneficios;
          this.form = this.formVacio();
          this.mostrarFormulario = false;
          this.publicando = false;
        },
        error: () => { this.publicando = false; },
      });
  }

  /* ── Helpers de vista ──────────────────────────────────── */
  categoriaStyle(cat: string): Record<string, string> {
    const c = CATEGORIA_COLORS[cat] ?? CATEGORIA_COLORS['Formación'];
    return { background: c.bg, color: c.fg };
  }

  estadoCls(b: BeneficioEmpresa): string {
    if (b.estadoPublicacion === 'agotado') return 'pub-badge pub-badge--agotado';
    if (b.estadoPublicacion === 'vencido') return 'pub-badge pub-badge--vencido';
    return 'pub-badge pub-badge--activo';
  }

  estadoLabel(b: BeneficioEmpresa): string {
    if (b.estadoPublicacion === 'agotado') return 'Agotado';
    if (b.estadoPublicacion === 'vencido') return 'Vencido';
    return 'Activo';
  }

  estadoIcon(b: BeneficioEmpresa): string {
    if (b.estadoPublicacion === 'agotado') return 'block';
    if (b.estadoPublicacion === 'vencido') return 'event_busy';
    return 'check_circle';
  }

  pct(b: BeneficioEmpresa): number {
    return b.cuposIniciales > 0 ? (b.cuposRestantes / b.cuposIniciales) * 100 : 0;
  }

  /* ── Menu / sesión ─────────────────────────────────────── */
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void  { setTimeout(() => { this.menuOpen = false; }, 150); }
  logout(): void     { this.autenticacion.logout('logout-manual'); }
}
