import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Beneficio, BENEFICIOS_INSTITUCIONALES_UD, CATEGORIA_COLORS, categoriaColor } from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';
import { BeneficiosService } from '../../core/services/beneficios.service';
import { SolicitudesService } from '../../core/services/solicitudes.service';
import { UsuarioSesion, UsuarioSesionService } from '../../core/services/usuario-sesion.service';

interface Filtros {
  query: string;
  categoria: string;
  sort: 'recientes' | 'vencen' | 'cupos';
  soloConCupos: boolean;
}

@Component({
    selector: 'app-catalogo',
    templateUrl: './catalogo.component.html',
    styleUrls: ['./catalogo.component.scss'],
    standalone: false
})
export class CatalogoComponent implements OnInit, OnDestroy {
  readonly PER_PAGE = 6;

  usuario: UsuarioSesion = this.sesionSvc.sesion;

  beneficios: Beneficio[] = [];
  menuOpen = false;
  /** Beneficio en proceso de solicitud (modal abierto) */
  modalBeneficio?: Beneficio;

  private destroy$ = new Subject<void>();

  filtros: Filtros = {
    query: '',
    categoria: 'todas',
    sort: 'recientes',
    soloConCupos: false,
  };

  page = 1;

  /** Opciones del filtro de categoría. Se reconstruyen desde el servicio de
   *  parámetros (misma fuente que las tarjetas, C-1) para que el filtro y los
   *  datos estén siempre homologados; esta lista es solo el estado inicial
   *  mientras responde (o si falla) el servicio. */
  categorias: { value: string; label: string }[] = [
    { value: 'todas',      label: 'Todas' },
    { value: 'Formación',  label: 'Formación' },
    { value: 'Carrera',    label: 'Carrera' },
    { value: 'Servicios',  label: 'Servicios' },
    { value: 'Salud',      label: 'Salud' },
    { value: 'Cultura',    label: 'Cultura' },
  ];

  readonly SORT_OPTIONS = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'vencen',    label: 'Vencen pronto' },
    { value: 'cupos',     label: 'Más cupos' },
  ];

  readonly CATEGORIA_COLORS = CATEGORIA_COLORS;

  /** Beneficios institucionales UD (Política de Egresados, Acuerdo 004/2024) */
  readonly BENEFICIOS_UD = BENEFICIOS_INSTITUCIONALES_UD;

  constructor(
    private autenticacion: ImplicitAutenticationService,
    private sesionSvc: UsuarioSesionService,
    private beneficiosSvc: BeneficiosService,
    private solicitudesSvc: SolicitudesService,
  ) {}

  ngOnInit(): void {
    this.sesionSvc.sesion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sesion => (this.usuario = sesion));

    this.beneficiosSvc.getCatalogo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(beneficios => (this.beneficios = beneficios));

    // Filtro de categorías homologado con los parámetros institucionales (C-1):
    // misma fuente que usan las tarjetas, así nunca divergen.
    this.beneficiosSvc.categorias$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cats => {
        if (cats.size === 0) return; // servicio caído: se conserva el fallback estático
        this.categorias = [
          { value: 'todas', label: 'Todas' },
          ...[...cats.values()].map(nombre => ({ value: nombre, label: nombre })),
        ];
        // Si el filtro activo ya no existe (p. ej. tras recargar), volver a 'todas'
        if (!this.categorias.some(c => c.value === this.filtros.categoria)) {
          this.filtros.categoria = 'todas';
        }
      });

    // Precarga "mis solicitudes" para que yaSolicitado() (RN-007) sea síncrono
    this.solicitudesSvc.cargar()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.autenticacion.logout('logout-manual');
  }

  get beneficiosFiltrados(): Beneficio[] {
    let arr = [...this.beneficios];
    if (this.filtros.categoria !== 'todas') {
      arr = arr.filter(b => b.categoria === this.filtros.categoria);
    }
    if (this.filtros.soloConCupos) {
      arr = arr.filter(b => b.cuposRestantes > 0);
    }
    if (this.filtros.query.trim()) {
      const q = this.filtros.query.toLowerCase();
      arr = arr.filter(b =>
        b.titulo.toLowerCase().includes(q) ||
        b.empresa.toLowerCase().includes(q) ||
        b.resumen.toLowerCase().includes(q)
      );
    }
    if (this.filtros.sort === 'vencen') {
      arr.sort((a, b) => a.vigenciaHasta.localeCompare(b.vigenciaHasta));
    } else if (this.filtros.sort === 'cupos') {
      arr.sort((a, b) => b.cuposRestantes - a.cuposRestantes);
    }
    return arr;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.beneficiosFiltrados.length / this.PER_PAGE));
  }

  get paginados(): Beneficio[] {
    const start = (this.page - 1) * this.PER_PAGE;
    return this.beneficiosFiltrados.slice(start, start + this.PER_PAGE);
  }

  get featured(): Beneficio | undefined {
    return this.beneficios.find(b => b.destacado);
  }

  get empresasCount(): number {
    return new Set(this.beneficios.map(b => b.empresa)).size;
  }

  get conCuposCount(): number {
    return this.beneficios.filter(b => b.cuposRestantes > 0).length;
  }

  onFiltrosChange(): void { this.page = 1; }

  resetFiltros(): void {
    this.filtros = { query: '', categoria: 'todas', sort: 'recientes', soloConCupos: false };
    this.page = 1;
  }

  changePage(p: number): void { this.page = p; }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  closeMenu(): void { setTimeout(() => { this.menuOpen = false; }, 150); }

  esAgotado(b: Beneficio): boolean { return b.cuposRestantes === 0; }
  esEscaso(b: Beneficio): boolean { return b.cuposRestantes > 0 && b.cuposRestantes <= 5; }

  cuposLabel(b: Beneficio): string {
    if (b.cuposRestantes === 0) return 'Sin cupos';
    return `${b.cuposRestantes} ${b.cuposRestantes === 1 ? 'cupo' : 'cupos'}`;
  }

  cuposNumCls(b: Beneficio): string {
    if (this.esAgotado(b)) return 'benef-card__cupo-num is-agotado';
    if (this.esEscaso(b))  return 'benef-card__cupo-num is-escaso';
    return 'benef-card__cupo-num';
  }

  barFillCls(b: Beneficio): string {
    if (this.esAgotado(b)) return 'benef-card__bar-fill is-agotado';
    if (this.esEscaso(b))  return 'benef-card__bar-fill is-escaso';
    return 'benef-card__bar-fill';
  }

  pct(b: Beneficio): number {
    return b.cuposIniciales > 0 ? (b.cuposRestantes / b.cuposIniciales) * 100 : 0;
  }

  categoriaStyle(cat: string): Record<string, string> {
    const c = categoriaColor(cat);
    return { background: c.bg, color: c.fg };
  }

  /** RN-007: el egresado ya tiene una solicitud en curso para este beneficio */
  yaSolicitado(b: Beneficio): boolean {
    return this.solicitudesSvc.yaSolicitado(b.id);
  }

  solicitar(b: Beneficio): void {
    if (this.esAgotado(b) || this.yaSolicitado(b)) return;
    this.modalBeneficio = b;
  }

  onModalCerrado(creada: boolean): void {
    this.modalBeneficio = undefined;
    // Tras crear una solicitud, refrescar catálogo y caché de solicitudes (cupos, RN-007)
    if (creada) {
      this.beneficiosSvc.getCatalogo()
        .pipe(takeUntil(this.destroy$))
        .subscribe(beneficios => (this.beneficios = beneficios));
    }
  }
}
