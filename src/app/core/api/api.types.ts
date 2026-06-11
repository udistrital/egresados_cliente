/* ============================================================
   Contratos HTTP del backend (MID + servicio de parámetros).
   Espejo de los JSON tags de los modelos Go del CRUD
   (sga_crud_beneficios_egresados/models) y del envelope OATI
   del MID (helpers/response.go).
   ============================================================ */

/** Envelope estándar del MID: { Status, Success, Body, Message } */
export interface ApiResponse<T> {
  Status: string;
  Success: boolean;
  Body?: T;
  Message?: string;
}

/** Parámetro institucional (servicio /apioas/parametros/v1, campos CamelCase) */
export interface ParametroDto {
  Id: number;
  Nombre: string;
  Descripcion?: string;
  CodigoAbreviacion: string;
  Activo?: boolean;
  NumeroOrden?: number;
  Valor?: string;
}

export interface UsuarioDto {
  id: number;
  documento: string;
  nombre: string;
  correo: string;
  tipo_usuario_id: number;
  sistema_origen: string;
}

export interface EgresadoDto {
  id: number;
  usuario?: UsuarioDto;
  codigo_institucional: string;
  programa_academico?: string;
  facultad?: string;
  telefono_contacto?: string;
}

export interface EmpresaDto {
  id: number;
  nit: string;
  razon_social: string;
  agora_id_externo?: string;
  sector_economico_id?: number;
  estado_empresa_id: number;
  sitio_web?: string;
  correo_contacto?: string;
  telefono_contacto?: string;
  direccion?: string;
}

export interface BeneficioDto {
  id: number;
  empresa?: EmpresaDto;
  categoria_beneficio_id: number;
  estado_beneficio_id: number;
  titulo: string;
  descripcion: string;
  condiciones: string;
  fecha_inicio: string;
  fecha_fin: string;
  cupos_total: number;
  cupos_disponibles: number;
  imagen_url?: string;
  fecha_publicacion?: string;
  fecha_creacion?: string;
}

/**
 * Solicitud con el estado vigente que el MID anexa desde el historial (C-4b):
 * estado_solicitud = codigo_abreviacion del parámetro ESTADO_SOLICITUD.
 */
export interface SolicitudDto {
  id: number;
  radicado: string;
  egresado?: EgresadoDto;
  beneficio?: BeneficioDto;
  datos_complementarios?: string;
  fecha_solicitud: string;
  fecha_modificacion?: string;
  estado_solicitud?: string;
  estado_solicitud_id?: number;
}

/** Ítem de la bandeja de empresa (el MID minimiza datos del egresado, RNF-002b) */
export interface BandejaItemDto {
  id: number;
  radicado: string;
  fecha_solicitud: string;
  estado_solicitud?: string;
  estado_solicitud_id?: number;
  datos_complementarios?: string;
  /** Hoy el MID solo envía nombre + codigo_institucional; los demás campos
      quedan tipados para cuando se enriquezca la bandeja (programa/facultad
      del egresado local o de C-2a, correo del usuario). */
  egresado?: {
    nombre?: string;
    codigo_institucional?: string;
    programa_academico?: string;
    facultad?: string;
    correo?: string;
  };
  beneficio?: { id?: number; titulo?: string };
}

export interface HistorialDto {
  id: number;
  estado_anterior_id?: number;
  estado_nuevo_id: number;
  usuario?: UsuarioDto;
  justificacion?: string;
  fecha_cambio: string;
}

export interface MensajeDto {
  id: number;
  usuario?: UsuarioDto;
  mensaje: string;
  fecha_envio: string;
}

export interface ResumenDto {
  activas: number;
  aprobadas: number;
  rechazadas: number;
  canceladas: number;
}
