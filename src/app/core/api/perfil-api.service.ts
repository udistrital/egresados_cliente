/* ============================================================
   Cliente HTTP del perfil del egresado (C-2a) contra los
   servicios institucionales documentados:
   - terceros_crud   → nombre y apellidos (AUTH_SPEC §3.4/§6.3)
   - sga_mid         → códigos/proyecto del estudiante (consultar_persona)
   - proyecto_academico_crud → facultad del proyecto
   ============================================================ */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** Tercero institucional (terceros_crud, campos CamelCase) */
export interface TerceroDto {
  Id: number;
  NombreCompleto?: string;
  PrimerNombre?: string;
  SegundoNombre?: string;
  PrimerApellido?: string;
  SegundoApellido?: string;
  UsuarioWSO2?: string;
}

interface DatosIdentificacionDto {
  Id: number;
  Numero?: string;
  Activo?: boolean;
  TerceroId?: TerceroDto;
}

/** Elemento de Data.Codigos[] de sga_mid consultar_persona (C-2a) */
export interface CodigoPersonaDto {
  Proyecto: string;   // "20700 - Ingeniería de Sistemas"
  Dato: string;       // código institucional/estudiantil
  IdProyecto: number;
  Activo: boolean;    // false → egresado (no estudiante activo)
}

@Injectable({ providedIn: 'root' })
export class PerfilApiService {

  constructor(private http: HttpClient) {}

  /** Nombre y apellidos del tercero a partir del documento (del token/userRol). */
  getTerceroPorDocumento(documento: string): Observable<TerceroDto | undefined> {
    const params = new HttpParams().set('query', `Activo:true,Numero:${documento}`);
    return this.http
      .get<DatosIdentificacionDto[]>(`${environment.TERCEROS_SERVICE}/datos_identificacion`, { params })
      .pipe(map(arr => arr?.[0]?.TerceroId));
  }

  /**
   * Códigos/proyectos del estudiante en el SGA (C-2a).
   * ⚠️ persona_id = ID interno del usuario en el SGA. Asumimos que coincide con
   * el Id del tercero — CONFIRMAR con el equipo del SGA antes de salir de demo.
   */
  getCodigosPersona(personaId: number): Observable<CodigoPersonaDto[]> {
    return this.http
      .get<Record<string, any>>(
        `${environment.SGA_MID}/derechos_pecuniarios/consultar_persona/${personaId}`)
      .pipe(map(res => {
        const data = res?.['Data'];
        // Variante documentada: Data.Codigos[] con {Proyecto, Dato, IdProyecto, Activo}
        const codigos: CodigoPersonaDto[] =
          data?.Codigos ?? data?.codigos ?? res?.['Codigos'] ?? [];
        if (codigos.length) return codigos;
        // Variante real observada (2026-06-10): Data es un objeto plano y el
        // código estudiantil viene en NumeroIdentificacion (TipoIdentificacion=CODE).
        // Esta variante no trae proyecto: programa/facultad quedan pendientes.
        if (data?.NumeroIdentificacion) {
          return [{
            Proyecto: '',
            Dato: String(data.NumeroIdentificacion),
            IdProyecto: 0,
            Activo: !!data.Activo,
          }];
        }
        console.warn('[perfil] consultar_persona — respuesta cruda:', JSON.stringify(res));
        return [];
      }));
  }

  /**
   * Facultad del proyecto académico. La forma exacta del campo facultad no está
   * en la documentación: se extrae de forma defensiva.
   */
  getFacultadProyecto(idProyecto: number): Observable<string> {
    return this.http
      .get<Record<string, any>>(
        `${environment.PROYECTO_ACADEMICO_SERVICE}/proyecto_academico_institucion/${idProyecto}`)
      .pipe(map(proy =>
        proy?.['FacultadNombre'] ??
        proy?.['Facultad']?.Nombre ??
        proy?.['facultad'] ?? '',
      ));
  }

  // TODO(foto): la foto del usuario vendría de info_complementaria_tercero
  // (AUTH_SPEC §6.3 #6) y posiblemente de Nuxeo (gestión documental).
  // Confirmar con OATI el mecanismo antes de implementarla; la UI ya soporta
  // `fotoUrl` con fallback a iniciales.
}
