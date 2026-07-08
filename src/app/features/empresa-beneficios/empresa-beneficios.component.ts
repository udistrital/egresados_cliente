/* ============================================================
   Gestión de Beneficios de Empresa · OATI Beneficios UD
   RF-005: publicación de beneficios (solo empresas aprobadas)
   ============================================================ */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Empresa, BeneficioEmpresa,
  CATEGORIA_COLORS, categoriaColor, EMPRESA_VACIA,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { BeneficiosService } from '../../core/services/beneficios.service';
import { EmpresaService, FormPublicarBeneficio } from '../../core/services/empresa.service';
import { EmpresaVinculada } from '../../core/services/usuario-sesion.service';
import { hoyLocalISO } from '../../core/api/mappers';

@Component({
  selector: 'app-empresa-beneficios',
  templateUrl: './empresa-beneficios.component.html',
  styleUrls: ['./empresa-beneficios.component.scss'],
})
export class EmpresaBeneficiosComponent implements OnInit, OnDestroy {

  empresa: Empresa = EMPRESA_VACIA;
  /** Empresas del usuario (selector multiempresa; el bloque solo aparece si hay >1) */
  empresas: EmpresaVinculada[] = [];
  beneficios: BeneficioEmpresa[] = [];
  /** true hasta la primera lista real (JIT + fetch) */
  cargandoBeneficios = true;

  menuOpen = false;
  mostrarFormulario = false;
  publicando = false;
  /** id del beneficio en edición (null = el formulario crea uno nuevo) */
  editandoId: number | null = null;
  /** error del guardado (p. ej. 422 del MID: "tiene solicitudes en curso") */
  errorGuardar: string | null = null;
  /** id del beneficio cuyo retiro está en curso (deshabilita el botón) */
  retirandoId: number | null = null;

  readonly CATEGORIA_COLORS = CATEGORIA_COLORS;

  /** Opciones del selector de categoría, homologadas con el servicio de
   *  parámetros (C-1). value = ID del parámetro (lo que el MID espera en
   *  categoria_beneficio_id); con nombres quemados el id no se resolvía y el
   *  payload salía sin categoría. */
  categorias: { value: string; label: string }[] = [];

  form: FormPublicarBeneficio = this.formVacio();

  /** Piso del input de vigencia: hoy (local). El picker no deja elegir antes
   *  y formValido lo revalida por si la fecha se escribe a mano. */
  readonly hoyISO = hoyLocalISO();

  /* ── Filtros / orden de la lista ─────────────────────────── */
  filtroEstado: 'todos' | 'activo' | 'agotado' | 'vencido' | 'borrador' | 'retirado' = 'todos';
  orden: 'recientes' | 'vencen' | 'pendientes' = 'recientes';
  query = '';

  readonly FILTROS_ESTADO = [
    { value: 'todos',    label: 'Todos' },
    { value: 'activo',   label: 'Activos' },
    { value: 'agotado',  label: 'Agotados' },
    { value: 'vencido',  label: 'Vencidos' },
    { value: 'borrador', label: 'Borradores' },
    { value: 'retirado', label: 'Retirados' },
  ];

  readonly ORDEN_OPTS = [
    { value: 'recientes',  label: 'Más recientes' },
    { value: 'vencen',     label: 'Vencen pronto' },
    { value: 'pendientes', label: 'Más pendientes' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private empresaSvc: EmpresaService,
    private beneficiosSvc: BeneficiosService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // ?publicar=1 (CTA del dashboard): abrir el formulario de una vez y limpiar
    // el param para que refrescar/volver no lo reabra.
    if (this.route.snapshot.queryParamMap.has('publicar')) {
      this.mostrarFormulario = true;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { publicar: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    this.beneficiosSvc.categorias$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cats => {
        this.categorias = [...cats.entries()]
          .map(([id, nombre]) => ({ value: String(id), label: nombre }));
      });

    this.empresaSvc.getEmpresa()
      .pipe(takeUntil(this.destroy$))
      .subscribe(empresa => (this.empresa = empresa));

    this.empresaSvc.getEmpresasVinculadas()
      .pipe(takeUntil(this.destroy$))
      .subscribe(empresas => (this.empresas = empresas));

    this.empresaSvc.getBeneficiosEmpresa()
      .pipe(takeUntil(this.destroy$))
      .subscribe(beneficios => {
        this.beneficios = beneficios;
        this.cargandoBeneficios = false;
      });

    // Tope de gracia: si el JIT de empresa falla, la fachada nunca emite —
    // soltar el skeleton y dejar que el estado vacío cuente la verdad.
    timer(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => (this.cargandoBeneficios = false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Lista filtrada / ordenada ───────────────────────────── */
  get beneficiosFiltrados(): BeneficioEmpresa[] {
    let arr = [...this.beneficios];
    if (this.filtroEstado !== 'todos') {
      arr = arr.filter(b => b.estadoPublicacion === this.filtroEstado);
    }
    const q = this.query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(b =>
        b.titulo.toLowerCase().includes(q) ||
        b.categoria.toLowerCase().includes(q));
    }
    if (this.orden === 'vencen') {
      arr.sort((a, b) => (a.fechaFinIso ?? '9999').localeCompare(b.fechaFinIso ?? '9999'));
    } else if (this.orden === 'pendientes') {
      arr.sort((a, b) => b.solicitudesPendientes - a.solicitudesPendientes);
    } else {
      // "recientes": el id autoincremental refleja el orden de creación
      arr.sort((a, b) => Number(b.id) - Number(a.id));
    }
    return arr;
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
    return {
      titulo: '', categoria: '', cuposIniciales: null, vigenciaHasta: '', resumen: '',
      condiciones: '',
      documentosRequeridos: [],
    };
  }

  /* ── Documentos requeridos (opcional, del formulario de publicación) ──── */
  agregarDocumentoRequerido(): void {
    this.form.documentosRequeridos.push({ nombre: '', descripcion: '' });
  }

  quitarDocumentoRequerido(index: number): void {
    this.form.documentosRequeridos.splice(index, 1);
  }

  get formValido(): boolean {
    const f = this.form;
    return !!(
      f.titulo.trim() &&
      f.categoria &&
      f.cuposIniciales && f.cuposIniciales > 0 &&
      f.vigenciaHasta && !this.vigenciaPasada &&
      f.resumen.trim() &&
      f.condiciones.trim()
    );
  }

  /** true si la vigencia elegida es anterior a hoy (comparación lexicográfica,
   *  ambos en "YYYY-MM-DD" local). */
  get vigenciaPasada(): boolean {
    return !!this.form.vigenciaHasta && this.form.vigenciaHasta < this.hoyISO;
  }

  toggleFormulario(): void {
    this.mostrarFormulario = !this.mostrarFormulario;
    this.editandoId = null;
    this.errorGuardar = null;
    if (!this.mostrarFormulario) this.form = this.formVacio();
  }

  /** true mientras el form está en modo edición (cambia títulos y submit). */
  get editando(): boolean {
    return this.editandoId != null;
  }

  /** Abre el formulario precargado con el beneficio (RF-005 editar). */
  abrirEdicion(b: BeneficioEmpresa): void {
    this.errorGuardar = null;
    this.empresaSvc.getFormBeneficio(Number(b.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: form => {
          this.form = form;
          this.editandoId = Number(b.id);
          this.mostrarFormulario = true;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: err => (this.errorGuardar = err?.message ?? 'No se pudo cargar el beneficio'),
      });
  }

  /** Submit del formulario: crea (publicar) o guarda (editar) según el modo. */
  guardar(): void {
    if (!this.formValido || this.form.categoria === '' || this.publicando) return;
    this.publicando = true;
    this.errorGuardar = null;
    const operacion = this.editandoId != null
      ? this.empresaSvc.editar(this.editandoId, this.form)
      : this.empresaSvc.publicar(this.form, this.empresa);
    operacion
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: beneficios => {
          this.beneficios = beneficios;
          this.form = this.formVacio();
          this.mostrarFormulario = false;
          this.editandoId = null;
          this.publicando = false;
        },
        error: err => {
          this.publicando = false;
          this.errorGuardar = err?.message ?? 'No se pudo guardar el beneficio';
        },
      });
  }

  /** ¿La card muestra el botón de editar? El MID revalida la regla de todas formas. */
  puedeEditar(b: BeneficioEmpresa): boolean {
    return b.estadoPublicacion === 'borrador' || b.estadoPublicacion === 'activo';
  }

  /** Retirar ("cerrar") un beneficio, con confirmación. */
  retirar(b: BeneficioEmpresa): void {
    if (this.retirandoId != null) return;
    const ok = window.confirm(
      `¿Retirar "${b.titulo}"?\n\nSaldrá del catálogo y no aceptará nuevas solicitudes. ` +
      'Las solicitudes en curso siguen en tu bandeja para responderlas.');
    if (!ok) return;
    this.retirandoId = Number(b.id);
    this.empresaSvc.retirar(Number(b.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: beneficios => {
          this.beneficios = beneficios;
          this.retirandoId = null;
        },
        error: err => {
          this.retirandoId = null;
          this.errorGuardar = err?.message ?? 'No se pudo retirar el beneficio';
        },
      });
  }

  /* ── Helpers de vista ──────────────────────────────────── */
  categoriaStyle(cat: string): Record<string, string> {
    const c = categoriaColor(cat);
    return { background: c.bg, color: c.fg };
  }

  estadoCls(b: BeneficioEmpresa): string {
    if (b.estadoPublicacion === 'agotado')  return 'pub-badge pub-badge--agotado';
    if (b.estadoPublicacion === 'vencido')  return 'pub-badge pub-badge--vencido';
    if (b.estadoPublicacion === 'retirado') return 'pub-badge pub-badge--vencido';
    if (b.estadoPublicacion === 'borrador') return 'pub-badge';
    return 'pub-badge pub-badge--activo';
  }

  estadoLabel(b: BeneficioEmpresa): string {
    if (b.estadoPublicacion === 'agotado')  return 'Agotado';
    if (b.estadoPublicacion === 'vencido')  return 'Vencido';
    if (b.estadoPublicacion === 'retirado') return 'Retirado';
    if (b.estadoPublicacion === 'borrador') return 'Borrador';
    return 'Activo';
  }

  estadoIcon(b: BeneficioEmpresa): string {
    if (b.estadoPublicacion === 'agotado')  return 'block';
    if (b.estadoPublicacion === 'vencido')  return 'event_busy';
    if (b.estadoPublicacion === 'retirado') return 'archive';
    if (b.estadoPublicacion === 'borrador') return 'edit_note';
    return 'check_circle';
  }

  pct(b: BeneficioEmpresa): number {
    return b.cuposIniciales > 0 ? (b.cuposRestantes / b.cuposIniciales) * 100 : 0;
  }

  /* ── Menu / sesión ─────────────────────────────────────── */
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void  { setTimeout(() => { this.menuOpen = false; }, 150); }
  logout(): void     { this.autenticacion.logout('logout-manual'); }

  /** Selector multiempresa: la lista recarga sola (fachada reactiva a sesion$). */
  esEmpresaActiva(e: EmpresaVinculada): boolean {
    return this.empresaSvc.empresaActivaId === e.empresaId;
  }
  cambiarEmpresa(e: EmpresaVinculada): void {
    this.empresaSvc.cambiarEmpresa(e.empresaId);
    this.menuOpen = false;
    // Estado de trabajo de la empresa anterior: no debe sobrevivir al cambio.
    this.mostrarFormulario = false;
    this.form = this.formVacio();
    this.editandoId = null;
    this.errorGuardar = null;
    this.cargandoBeneficios = true;
  }
}
