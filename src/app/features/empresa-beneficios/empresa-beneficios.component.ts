/* ============================================================
   Gestión de Beneficios de Empresa · OATI Beneficios UD
   RF-005: publicación de beneficios (solo empresas aprobadas)
   ============================================================ */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Empresa, BeneficioEmpresa, CategoriaBeneficio,
  CATEGORIA_COLORS, EMPRESA_DEMO, BENEFICIOS_EMPRESA_DEMO,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';

interface FormBeneficio {
  titulo: string;
  categoria: CategoriaBeneficio | '';
  cuposIniciales: number | null;
  vigenciaHasta: string;
  resumen: string;
}

@Component({
  selector: 'app-empresa-beneficios',
  templateUrl: './empresa-beneficios.component.html',
  styleUrls: ['./empresa-beneficios.component.scss'],
})
export class EmpresaBeneficiosComponent implements OnInit, OnDestroy {

  empresa: Empresa = EMPRESA_DEMO;
  beneficios: BeneficioEmpresa[] = [...BENEFICIOS_EMPRESA_DEMO];

  menuOpen = false;
  mostrarFormulario = false;

  readonly CATEGORIA_COLORS = CATEGORIA_COLORS;

  readonly CATEGORIAS: { value: CategoriaBeneficio; label: string }[] = [
    { value: 'Formación',  label: 'Formación' },
    { value: 'Carrera',    label: 'Carrera' },
    { value: 'Servicios',  label: 'Servicios' },
    { value: 'Salud',      label: 'Salud' },
    { value: 'Cultura',    label: 'Cultura' },
  ];

  form: FormBeneficio = this.formVacio();

  private destroy$ = new Subject<void>();
  private nextId = 100;

  constructor(private autenticacion: ImplicitAutenticationService) {}

  ngOnInit(): void {
    this.autenticacion.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const { user, userService } = data;
        if (!user && !userService) return;
        /* En integración real se cargará la empresa desde el token/servicio */
      });
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
  private formVacio(): FormBeneficio {
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
    if (!this.formValido || this.form.categoria === '') return;
    const nuevo: BeneficioEmpresa = {
      id: `b${this.nextId++}`,
      titulo: this.form.titulo.trim(),
      empresa: this.empresa.nombre,
      isotipo: this.empresa.iniciales,
      categoria: this.form.categoria as CategoriaBeneficio,
      cuposIniciales: this.form.cuposIniciales!,
      cuposRestantes: this.form.cuposIniciales!,
      vigenciaHasta: this.form.vigenciaHasta,
      publicado: 'Ahora',
      destacado: false,
      resumen: this.form.resumen.trim(),
      estadoPublicacion: 'activo',
      solicitudesRecibidas: 0,
      solicitudesPendientes: 0,
    };
    this.beneficios = [nuevo, ...this.beneficios];
    this.form = this.formVacio();
    this.mostrarFormulario = false;
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
