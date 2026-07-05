/* ============================================================
   Fachada de catálogo de beneficios (vista egresado).
   Consume el MID real vía BeneficiosMidService + mappers; los
   componentes solo dependen de esta fachada.
   ============================================================ */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { Beneficio, BeneficioDetalle, PerfilEmpresa } from '../../shared/oati.types';
import { BeneficiosMidService } from '../api/beneficios-mid.service';
import { CategoriaMap, mapBeneficio, mapBeneficioDetalle, mapPerfilEmpresa, ordenarBeneficiosRecientes } from '../api/mappers';

export interface DetalleBeneficio {
  beneficio?: Beneficio;
  detalle?: BeneficioDetalle;
}

@Injectable({ providedIn: 'root' })
export class BeneficiosService {

  /** id de parámetro → nombre de categoría (C-1); cacheado para toda la sesión */
  readonly categorias$: Observable<CategoriaMap> = this.api.getCategorias().pipe(
    map(params => new Map(params.map(p => [p.Id, p.Nombre]))),
    catchError(() => of(new Map<number, string>())),
    shareReplay(1),
  );

  constructor(private api: BeneficiosMidService) {}

  /** RF-002: catálogo de beneficios PUBLICADOS vigentes. */
  getCatalogo(): Observable<Beneficio[]> {
    return this.categorias$.pipe(
      switchMap(cats => this.api.getCatalogo().pipe(
        map(dtos => ordenarBeneficiosRecientes(dtos ?? []).map(d => mapBeneficio(d, cats))),
      )),
    );
  }

  /** RF-003: detalle de un beneficio (cabecera + descripción/condiciones). */
  getDetalle(id: string): Observable<DetalleBeneficio> {
    return this.categorias$.pipe(
      switchMap(cats => this.api.getBeneficio(Number(id)).pipe(
        map(dto => ({
          beneficio: mapBeneficio(dto, cats),
          detalle: mapBeneficioDetalle(dto),
        })),
      )),
    );
  }

  /** Perfil público de la empresa aliada ("acerca de la empresa" del detalle). */
  getPerfilEmpresa(empresaId: number): Observable<PerfilEmpresa | undefined> {
    if (!empresaId) return of(undefined);
    return this.api.getPerfilEmpresa(empresaId).pipe(
      map(dto => mapPerfilEmpresa(dto)),
      catchError(() => of(undefined)), // best-effort: el detalle vive sin el perfil
    );
  }
}
