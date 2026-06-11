/* ============================================================
   Fachada de catálogo de beneficios (vista egresado).
   DEMO_MODE=true  → datos en memoria (oati.types).
   DEMO_MODE=false → MID real vía BeneficiosMidService + mappers.
   Los componentes solo dependen de esta fachada: el switch a
   integración real no los toca.
   ============================================================ */
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Beneficio, BeneficioDetalle, BENEFICIOS_DEMO, BENEFICIO_DETALLES_DEMO,
} from '../../shared/oati.types';
import { BeneficiosMidService } from '../api/beneficios-mid.service';
import { CategoriaMap, mapBeneficio, mapBeneficioDetalle } from '../api/mappers';

export interface DetalleBeneficio {
  beneficio?: Beneficio;
  detalle?: BeneficioDetalle;
}

@Injectable({ providedIn: 'root' })
export class BeneficiosService {

  /** id de parámetro → nombre de categoría (C-1); cacheado para toda la sesión */
  readonly categorias$: Observable<CategoriaMap> = environment.DEMO_MODE
    ? of(new Map<number, string>())
    : this.api.getCategorias().pipe(
        map(params => new Map(params.map(p => [p.Id, p.Nombre]))),
        catchError(() => of(new Map<number, string>())),
        shareReplay(1),
      );

  constructor(private api: BeneficiosMidService) {}

  /** RF-002: catálogo de beneficios PUBLICADOS vigentes. */
  getCatalogo(): Observable<Beneficio[]> {
    if (environment.DEMO_MODE) {
      // Misma referencia compartida: el servicio demo de solicitudes muta cupos sobre ella
      return of(BENEFICIOS_DEMO);
    }
    return this.categorias$.pipe(
      switchMap(cats => this.api.getCatalogo().pipe(
        map(dtos => (dtos ?? []).map(d => mapBeneficio(d, cats))),
      )),
    );
  }

  /** RF-003: detalle de un beneficio (cabecera + descripción/condiciones). */
  getDetalle(id: string): Observable<DetalleBeneficio> {
    if (environment.DEMO_MODE) {
      return of({
        beneficio: BENEFICIOS_DEMO.find(b => b.id === id),
        detalle: BENEFICIO_DETALLES_DEMO[id],
      });
    }
    return this.categorias$.pipe(
      switchMap(cats => this.api.getBeneficio(Number(id)).pipe(
        map(dto => ({
          beneficio: mapBeneficio(dto, cats),
          detalle: mapBeneficioDetalle(dto),
        })),
      )),
    );
  }
}
