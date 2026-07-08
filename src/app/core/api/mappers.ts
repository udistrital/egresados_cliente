/* ============================================================
   Mapeadores DTO del backend → modelos de la UI (oati.types).
   Centralizan la traducción snake_case/ids de parámetro → los
   tipos que consumen los componentes; las vistas nunca ven la
   forma cruda del MID.
   ============================================================ */
import {
  Beneficio, BeneficioDetalle, BeneficioEmpresa, CategoriaBeneficio, DocumentoRequerido,
  DocumentoSolicitudItem, EstadoSolicitud, HistorialEntrada, MensajeHilo, PerfilEmpresa,
  Solicitud, SolicitudRecibida,
} from '../../shared/oati.types';
import {
  BandejaItemDto, BeneficioDto, DocumentoRequeridoDto, DocumentoSolicitudDto, HistorialDto,
  MensajeDto, PerfilEmpresaDto, SolicitudDto,
} from './api.types';

/** codigo_abreviacion del parámetro ESTADO_SOLICITUD → clave de estado de la UI */
export const CODIGO_TO_ESTADO: Record<string, EstadoSolicitud> = {
  PENDIENTE: 'pendiente',
  EN_REVISION: 'revision',
  REQUIERE_INFO: 'info',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  CANCELADA: 'cancelada',
};

export const ESTADO_TO_CODIGO: Record<EstadoSolicitud, string> = {
  pendiente: 'PENDIENTE',
  revision: 'EN_REVISION',
  info: 'REQUIERE_INFO',
  aprobada: 'APROBADA',
  rechazada: 'RECHAZADA',
  cancelada: 'CANCELADA',
};

/** id de parámetro → nombre de categoría; se construye con /v1/categorias-beneficio */
export type CategoriaMap = Map<number, string>;

/** Fecha de HOY en zona horaria local como "YYYY-MM-DD" (para inputs type="date").
 *  NO usar toISOString().slice(0,10): es UTC y en Colombia (UTC-5) después de las
 *  7 p. m. devuelve el día de mañana. */
export function hoyLocalISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function fechaCorta(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** El CRUD serializa TIMESTAMP NULL como el zero-time de Go ("0001-01-01…");
 *  cualquier fecha anterior a 1970 se trata como ausente. */
function fechaPresente(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) || d.getFullYear() < 1970 ? undefined : iso;
}

/** Timestamp de un ISO tolerante al zero-time de Go; 0 si ausente/no parseable. */
function tsPresente(iso?: string): number {
  const v = fechaPresente(iso);
  return v ? new Date(v).getTime() : 0;
}

/** Catálogo "más recientes primero": fecha de publicación (o de creación)
 *  descendente; empata por id descendente (autoincremental = orden de creación).
 *  El CRUD lista ascendente por id — sin esto "recientes" mostraba los más viejos. */
export function ordenarBeneficiosRecientes<T extends BeneficioDto>(dtos: T[]): T[] {
  const ts = (d: T) => tsPresente(d.fecha_publicacion) || tsPresente(d.fecha_creacion);
  return [...dtos].sort((a, b) => ts(b) - ts(a) || (b.id ?? 0) - (a.id ?? 0));
}

/** Solicitudes "más recientes primero": última actividad (fecha_modificacion,
 *  con fallback a fecha_solicitud) descendente; empata por id descendente. */
export function ordenarSolicitudesRecientes<
  T extends { id?: number; fecha_solicitud?: string; fecha_modificacion?: string }
>(dtos: T[]): T[] {
  const ts = (d: T) => tsPresente(d.fecha_modificacion) || tsPresente(d.fecha_solicitud);
  return [...dtos].sort((a, b) => ts(b) - ts(a) || (b.id ?? 0) - (a.id ?? 0));
}

export function fechaRelativa(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  if (dias < 30) return `Hace ${Math.floor(dias / 7)} semana${dias >= 14 ? 's' : ''}`;
  return fechaCorta(iso);
}

function iniciales(nombre: string): string {
  const tokens = nombre.trim().split(/\s+/);
  return tokens.length >= 2
    ? (tokens[0][0] + tokens[1][0]).toUpperCase()
    : (nombre[0] ?? '?').toUpperCase();
}

function truncar(texto: string, max = 180): string {
  if (!texto || texto.length <= max) return texto ?? '';
  return texto.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function mapBeneficio(dto: BeneficioDto, categorias: CategoriaMap): Beneficio {
  const empresa = dto.empresa?.razon_social ?? '';
  return {
    id: String(dto.id),
    titulo: dto.titulo,
    empresa,
    isotipo: iniciales(empresa || dto.titulo),
    categoria: (categorias.get(dto.categoria_beneficio_id) ?? 'Formación') as CategoriaBeneficio,
    cuposIniciales: dto.cupos_total,
    cuposRestantes: dto.cupos_disponibles,
    vigenciaHasta: fechaCorta(dto.fecha_fin),
    publicado: fechaRelativa(fechaPresente(dto.fecha_publicacion) ?? dto.fecha_creacion),
    destacado: false, // el backend aún no modela destacados
    resumen: truncar(dto.descripcion),
    empresaId: dto.empresa?.id,
    fechaFinIso: dto.fecha_fin,
    totalSolicitudes: dto.total_solicitudes,
  };
}

export function mapBeneficioDetalle(dto: BeneficioDto): BeneficioDetalle {
  return {
    descripcion: dto.descripcion,
    condiciones: dto.condiciones,
    documentosRequeridos: (dto.documentos_requeridos ?? []).map(mapDocumentoRequerido),
  };
}

export function mapDocumentoRequerido(dto: DocumentoRequeridoDto): DocumentoRequerido {
  return { id: dto.id, nombre: dto.nombre, descripcion: dto.descripcion };
}

export function mapDocumentoSolicitud(dto: DocumentoSolicitudDto): DocumentoSolicitudItem {
  return {
    documentoRequeridoId: dto.documento_requerido_id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    subido: dto.subido,
    documentoSolicitudId: dto.documento_solicitud_id,
    nombreArchivo: dto.nombre_archivo,
    comentarioEmpresa: dto.comentario_empresa,
    fechaComentario: dto.fecha_comentario,
  };
}

/** Vista de gestión del dueño: beneficio + estado de publicación + métricas. */
export function mapBeneficioEmpresa(dto: BeneficioDto, categorias: CategoriaMap): BeneficioEmpresa {
  const base = mapBeneficio(dto, categorias);
  const vencidoPorFecha = dto.fecha_fin
    ? new Date(dto.fecha_fin).getTime() < Date.now()
    : false;
  const estado = dto.estado_beneficio;
  const estadoPublicacion: BeneficioEmpresa['estadoPublicacion'] =
    estado === 'BORRADOR' ? 'borrador' :
    estado === 'RETIRADO' ? 'retirado' :
    (estado === 'VENCIDO' || vencidoPorFecha) ? 'vencido' :
    dto.cupos_disponibles === 0 ? 'agotado' : 'activo';
  return {
    ...base,
    estadoPublicacion,
    solicitudesRecibidas: dto.total_solicitudes ?? 0,
    solicitudesPendientes: dto.solicitudes_pendientes ?? 0,
  };
}

export function mapPerfilEmpresa(dto: PerfilEmpresaDto): PerfilEmpresa {
  return {
    empresaId: dto.empresa_id,
    razonSocial: dto.razon_social,
    descripcion: dto.descripcion,
    sitioWeb: dto.sitio_web,
    telefono: dto.telefono,
    direccion: dto.direccion,
    correoContacto: dto.correo_contacto,
    aliadoDesde: dto.aliado_desde,
    beneficiosPublicados: dto.beneficios_publicados ?? 0,
    beneficiosEntregados: dto.beneficios_entregados ?? 0,
  };
}

export function mapSolicitud(dto: SolicitudDto, categorias: CategoriaMap): Solicitud {
  return {
    id: dto.id,
    radicado: dto.radicado,
    beneficioId: dto.beneficio ? String(dto.beneficio.id) : undefined,
    beneficio: dto.beneficio?.titulo ?? '',
    empresa: dto.beneficio?.empresa?.razon_social ?? '',
    categoria: categorias.get(dto.beneficio?.categoria_beneficio_id ?? -1) ?? '',
    estado: CODIGO_TO_ESTADO[dto.estado_solicitud ?? ''] ?? 'pendiente',
    actualizada: fechaRelativa(dto.fecha_modificacion ?? dto.fecha_solicitud),
    fechaSolicitud: fechaCorta(dto.fecha_solicitud),
    cuposRestantes: dto.beneficio?.cupos_disponibles ?? 0,
  };
}

export function mapSolicitudRecibida(dto: BandejaItemDto): SolicitudRecibida {
  return {
    id: dto.id,
    radicado: dto.radicado,
    beneficioId: dto.beneficio?.id != null ? String(dto.beneficio.id) : '',
    beneficio: dto.beneficio?.titulo ?? '',
    egresado: dto.egresado?.nombre ?? '',
    // Mientras el MID no enriquezca la bandeja, programa cae al código institucional
    programa: dto.egresado?.programa_academico ?? dto.egresado?.codigo_institucional ?? '',
    facultad: dto.egresado?.facultad,
    email: dto.egresado?.correo ?? '',
    estado: CODIGO_TO_ESTADO[dto.estado_solicitud ?? ''] ?? 'pendiente',
    fechaSolicitud: fechaCorta(dto.fecha_solicitud),
    actualizada: fechaRelativa(dto.fecha_solicitud),
    datosComplementarios: dto.datos_complementarios,
  };
}

/**
 * Mapea la bitácora. Los estados llegan como codigo_abreviacion ya resueltos por el
 * MID (estado_anterior/estado_nuevo); el actor se infiere comparando el usuario del
 * registro con el usuario en sesión (mientras el CRUD no exponga el tipo resuelto).
 */
export function mapHistorial(
  dto: HistorialDto,
  actorDe: (usuarioId?: number) => 'egresado' | 'empresa',
): HistorialEntrada {
  return {
    estadoAnterior: dto.estado_anterior ? CODIGO_TO_ESTADO[dto.estado_anterior] : undefined,
    estadoNuevo: (dto.estado_nuevo && CODIGO_TO_ESTADO[dto.estado_nuevo]) || 'pendiente',
    actor: actorDe(dto.usuario?.id),
    justificacion: dto.justificacion,
    fecha: fechaRelativa(dto.fecha_cambio),
  };
}

export function mapMensaje(
  dto: MensajeDto,
  actorDe: (usuarioId?: number) => 'egresado' | 'empresa',
): MensajeHilo {
  return {
    autor: actorDe(dto.usuario?.id),
    nombre: dto.usuario?.nombre ?? '',
    mensaje: dto.mensaje,
    fecha: fechaRelativa(dto.fecha_envio),
  };
}
