import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Beneficio,
  CATEGORIA_COLORS, BENEFICIOS_DEMO,
} from '../../shared/oati.types';
import { ImplicitAutenticationService } from '../../core/services/implicit-autentication.service';

interface Filtros {
  query: string;
  categoria: string;
  sort: 'recientes' | 'vencen' | 'cupos';
  soloConCupos: boolean;
}

interface UsuarioMenu {
  iniciales: string;
  primerNombre: string;
  rol: string;
  nombre: string;
  email: string;
  documento: string;
}

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss'],
})
export class CatalogoComponent implements OnInit, OnDestroy {
  readonly PER_PAGE = 6;

  usuario: UsuarioMenu = {
    iniciales: '…',
    primerNombre: 'Cargando…',
    rol: '',
    nombre: '',
    email: '',
    documento: '',
  };

  beneficios: Beneficio[] = BENEFICIOS_DEMO;
  menuOpen = false;

  private destroy$ = new Subject<void>();

  filtros: Filtros = {
    query: '',
    categoria: 'todas',
    sort: 'recientes',
    soloConCupos: false,
  };

  page = 1;

  readonly CATEGORIAS = [
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

  constructor(private autenticacion: ImplicitAutenticationService) {}

  ngOnInit(): void {
    this.autenticacion.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        const { user, userService } = data;
        if (!user && !userService) return;

        // Construir nombre: intentar campos del mid (SGA pattern), caer al email
        const primerNombre: string =
          userService?.PrimerNombre ?? userService?.nombre ?? '';
        const primerApellido: string =
          userService?.PrimerApellido ?? userService?.apellido ?? '';
        const nombreCompleto =
          primerNombre && primerApellido
            ? `${primerNombre} ${primerApellido}`
            : primerNombre || user?.email || userService?.email || '';

        const email: string = userService?.email ?? userService?.Email ?? user?.email ?? '';
        const documento: string = userService?.documento ?? userService?.Documento ?? '';

        // Iniciales: primeras letras de los dos primeros tokens del nombre
        const tokens = nombreCompleto.trim().split(/\s+/);
        const iniciales =
          tokens.length >= 2
            ? (tokens[0][0] + tokens[1][0]).toUpperCase()
            : (nombreCompleto[0] ?? email[0] ?? '?').toUpperCase();

        // Rol para mostrar debajo del nombre
        const roles: string[] = userService?.role ?? user?.role ?? [];
        const rolLabel = roles.length > 0 ? roles[0] : 'Egresado';

        this.usuario = {
          iniciales,
          primerNombre: primerNombre || email.split('@')[0],
          nombre: nombreCompleto || email,
          email,
          documento,
          rol: rolLabel,
        };
      });
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
    const c = CATEGORIA_COLORS[cat] ?? CATEGORIA_COLORS['Formación'];
    return { background: c.bg, color: c.fg };
  }

  solicitar(b: Beneficio): void {
    // En integración real: llamar al servicio MID y navegar a detalle
    console.log('Solicitar:', b.titulo);
  }
}
