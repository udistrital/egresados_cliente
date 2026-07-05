/* ============================================================
   Tipos compartidos · Portal de Beneficios Egresados UD
   ============================================================ */

export type Rol = 'egresado' | 'empresa';

export type EstadoSolicitud =
  | 'pendiente'
  | 'revision'
  | 'info'
  | 'aprobada'
  | 'rechazada'
  | 'cancelada';

export type CategoriaBeneficio =
  | 'Formación'
  | 'Carrera'
  | 'Servicios'
  | 'Salud'
  | 'Cultura';

export interface Solicitud {
  /** id de solicitud_beneficio en el backend (las acciones del MID van por id) */
  id?: number;
  radicado: string;
  beneficioId?: string;
  beneficio: string;
  empresa: string;
  categoria: string;
  estado: EstadoSolicitud;
  actualizada: string;
  fechaSolicitud: string;
  cuposRestantes: number;
}

export interface Beneficio {
  id: string;
  titulo: string;
  empresa: string;
  isotipo: string;
  categoria: CategoriaBeneficio;
  cuposIniciales: number;
  cuposRestantes: number;
  vigenciaHasta: string;
  publicado: string;
  destacado: boolean;
  resumen: string;
  /** id local de la empresa (para el perfil "acerca de la empresa") */
  empresaId?: number;
  /** fecha de fin ISO cruda (countdown "cierra en N días") */
  fechaFinIso?: string;
  /** social proof: total de solicitudes históricas del beneficio */
  totalSolicitudes?: number;
}

/** Detalle extendido de un beneficio (en integración real: GET mid /v1/beneficios/:id) */
export interface BeneficioDetalle {
  descripcion: string;
  condiciones: string;
  /** Documentos que la empresa exige para postularse (vacío = ninguno) */
  documentosRequeridos: DocumentoRequerido[];
}

/** Documento que la empresa exige para postularse (definido al publicar el beneficio) */
export interface DocumentoRequerido {
  id?: number;
  nombre: string;
  descripcion: string;
}

/**
 * Documento requerido visto desde una solicitud puntual: el requisito + si ya se
 * subió (y con qué datos). Misma forma para la vista del egresado (qué le falta) y
 * la de la empresa (qué revisar/comentar).
 */
export interface DocumentoSolicitudItem {
  documentoRequeridoId: number;
  nombre: string;
  descripcion: string;
  subido: boolean;
  documentoSolicitudId?: number;
  nombreArchivo?: string;
  comentarioEmpresa?: string;
  fechaComentario?: string;
}

/** Perfil público de la empresa aliada (GET mid /v1/empresas/:id, whitelist RNF-002b) */
export interface PerfilEmpresa {
  empresaId: number;
  razonSocial: string;
  descripcion?: string;
  sitioWeb?: string;
  telefono?: string;
  direccion?: string;
  correoContacto?: string;
  /** Registrada como proveedor UD desde (YYYY-MM-DD, de Ágora) */
  aliadoDesde?: string;
  beneficiosPublicados: number;
  beneficiosEntregados: number;
}

/* ============================================================
   Beneficios institucionales — los que la UD da a sus egresados
   por serlo (Política de Egresados, Acuerdo 004 de 2024 CSU).
   Contenido curado del portal oficial egresados.udistrital.edu.co
   y de la DIE (verificado 2026-07-02).
   ============================================================ */
export interface BeneficioInstitucional {
  icon: string;
  titulo: string;
  descripcion: string;
  url: string;
}

export const BENEFICIOS_INSTITUCIONALES_UD: BeneficioInstitucional[] = [
  {
    icon: 'school',
    titulo: 'Descuento en posgrados',
    descripcion: '30% de exoneración en la matrícula de posgrados UD por ser egresado de pregrado.',
    url: 'https://die.udistrital.edu.co/conoce_los_beneficios_y_descuentos_para_el_pago_de_matricula',
  },
  {
    icon: 'work',
    titulo: 'Empleabilidad',
    descripcion: 'Bolsa de empleo y acompañamiento en tu búsqueda laboral.',
    url: 'https://egresados.udistrital.edu.co/servicios/empleabilidad',
  },
  {
    icon: 'rocket_launch',
    titulo: 'Emprendimiento',
    descripcion: 'Asesoría para crear y fortalecer tu propio negocio.',
    url: 'https://egresados.udistrital.edu.co/servicios/emprendimiento',
  },
  {
    icon: 'badge',
    titulo: 'Carné de egresado',
    descripcion: 'Carnetización que te acredita como parte de la comunidad UD.',
    url: 'https://egresados.udistrital.edu.co/servicios/carnetizacion',
  },
  {
    icon: 'mail',
    titulo: 'Correo institucional',
    descripcion: 'Servicio de correo UD para egresados a través de la red UDNET.',
    url: 'https://egresados.udistrital.edu.co/servicios/red-de-datos-udnet',
  },
  {
    icon: 'computer',
    titulo: 'Cursos virtuales',
    descripcion: 'Capacitación en línea gratuita para seguir formándote.',
    url: 'https://egresados.udistrital.edu.co/servicios/cursos-virtuales',
  },
  {
    icon: 'diversity_3',
    titulo: 'Mentorías Egresados UD',
    descripcion: 'Programa de mentoría entre egresados de la Universidad.',
    url: 'https://egresados.udistrital.edu.co/servicios/mentoria',
  },
  {
    icon: 'meeting_room',
    titulo: 'Coworking de egresados',
    descripcion: 'Salas de coworking equipadas para trabajar y hacer networking.',
    url: 'https://egresados.udistrital.edu.co/servicios/oficina-de-egresados',
  },
  {
    icon: 'sports_soccer',
    titulo: 'Deportes y bienestar',
    descripcion: 'Programas deportivos y de bienestar abiertos a egresados.',
    url: 'https://egresados.udistrital.edu.co/servicios/deportes',
  },
];

export interface Egresado {
  nombre: string;
  primerNombre: string;
  programa: string;
  facultad: string;
  email: string;
  cohorte: string;
  iniciales: string;
}

export interface StatsResumen {
  activas: number;
  aprobadas: number;
  rechazadas: number;
  canceladas: number;
  total: number;
}

export interface EstadoConfig {
  label: string;
  icon: string;
  cls: string;
  isActive: boolean;
  isFinal: boolean;
}

export const ESTADOS: Record<EstadoSolicitud, EstadoConfig> = {
  pendiente: { label: 'Pendiente',            icon: 'hourglass_empty', cls: 'pendiente', isActive: true,  isFinal: false },
  revision:  { label: 'En revisión',          icon: 'manage_search',   cls: 'revision',  isActive: true,  isFinal: false },
  // Etiqueta corta a propósito: la completa ("Requiere información") desborda las
  // pastillas en celdas angostas (bandeja empresa: columna de estado de 110px).
  info:      { label: 'Requiere info',        icon: 'info',            cls: 'info',      isActive: true,  isFinal: false },
  aprobada:  { label: 'Aprobada',             icon: 'check_circle',    cls: 'aprobada',  isActive: false, isFinal: true  },
  rechazada: { label: 'Rechazada',            icon: 'cancel',          cls: 'rechazada', isActive: false, isFinal: true  },
  cancelada: { label: 'Cancelada',            icon: 'close',           cls: 'cancelada', isActive: false, isFinal: true  },
};

export const CATEGORIA_COLORS: Record<string, { bg: string; fg: string }> = {
  'Formación': { bg: 'rgba(20,56,115,.08)',  fg: 'var(--primary-700)' },
  'Carrera':   { bg: 'rgba(222,158,15,.14)', fg: '#7a4d00' },
  'Servicios': { bg: 'rgba(21,72,94,.10)',   fg: 'var(--teal-500)' },
  'Salud':     { bg: 'rgba(85,153,61,.14)',  fg: '#2A6A1A' },
  'Cultura':   { bg: 'rgba(180,90,140,.14)', fg: '#7a2a55' },
};

/**
 * Color de una categoría por palabra clave. Homologa los nombres REALES de los
 * parámetros institucionales (Educación, Empleo, Recreación, Descuentos, Otro…)
 * con la paleta anterior, sin depender de coincidencia exacta.
 */
export function categoriaColor(nombre: string): { bg: string; fg: string } {
  const n = (nombre ?? '').toLowerCase();
  if (n.includes('salud') || n.includes('bienestar'))     return CATEGORIA_COLORS['Salud'];
  if (n.includes('recrea') || n.includes('cultura'))      return CATEGORIA_COLORS['Cultura'];
  if (n.includes('empleo') || n.includes('carrera'))      return CATEGORIA_COLORS['Carrera'];
  if (n.includes('descuento') || n.includes('servicio'))  return CATEGORIA_COLORS['Servicios'];
  if (n.includes('educa') || n.includes('forma'))         return CATEGORIA_COLORS['Formación'];
  return CATEGORIA_COLORS[nombre] ?? CATEGORIA_COLORS['Formación'];
}


/* ============================================================
   Tipos — Submódulo Empresas UD
   ============================================================ */

export type EstadoEmpresa = 'revision' | 'aprobada' | 'rechazada';

export interface Empresa {
  id: string;
  nombre: string;
  nit: string;
  sector: string;
  sitioWeb: string;
  email: string;
  telefono: string;
  representante: string;
  descripcion: string;
  estado: EstadoEmpresa;
  iniciales: string;
}

/** Estado inicial neutro de las vistas de empresa mientras la fachada resuelve
 *  la empresa de la sesión (el flujo real de empresa está pendiente de cablear). */
export const EMPRESA_VACIA: Empresa = {
  id: '', nombre: 'Cargando…', nit: '', sector: '', sitioWeb: '', email: '',
  telefono: '', representante: '', descripcion: '', estado: 'aprobada', iniciales: '…',
};

/** Solicitud de un egresado vista desde la empresa */
export interface SolicitudRecibida {
  /** id de solicitud_beneficio en el backend (las acciones del MID van por id) */
  id?: number;
  radicado: string;
  beneficioId: string;
  beneficio: string;
  egresado: string;
  programa: string;
  facultad?: string;
  email: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  actualizada: string;
  nota?: string;
  /** Lo que el egresado escribió al solicitar (JSONB datos_complementarios) */
  datosComplementarios?: string;
}

/** Entrada de la bitácora de estados (CRUD: historial_solicitud, RN-004/C-4b) */
export interface HistorialEntrada {
  estadoAnterior?: EstadoSolicitud;
  estadoNuevo: EstadoSolicitud;
  actor: 'egresado' | 'empresa';
  justificacion?: string;
  fecha: string;
}

/** Mensaje del hilo empresa ↔ egresado (CRUD: mensaje_solicitud, RF-007) */
export interface MensajeHilo {
  autor: 'egresado' | 'empresa';
  nombre: string;
  mensaje: string;
  fecha: string;
}

/** Beneficio publicado por la empresa con métricas de gestión */
export interface BeneficioEmpresa extends Beneficio {
  estadoPublicacion: 'activo' | 'vencido' | 'agotado' | 'borrador' | 'retirado';
  solicitudesRecibidas: number;
  solicitudesPendientes: number;
}

