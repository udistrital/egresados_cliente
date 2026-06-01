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
  radicado: string;
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
}

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
  info:      { label: 'Requiere información', icon: 'info',            cls: 'info',      isActive: true,  isFinal: false },
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

/* Datos de demo */
export const EGRESADO_DEMO: Egresado = {
  nombre: 'María Camila Rodríguez',
  primerNombre: 'María Camila',
  programa: 'Ingeniería de Sistemas',
  facultad: 'Facultad de Ingeniería',
  email: 'mc.rodriguezp@udistrital.edu.co',
  cohorte: '2018-1 · Egresada 2023',
  iniciales: 'MR',
};

export const SOLICITUDES_DEMO: Solicitud[] = [
  { radicado: 'BNF-2026-000128', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento',  empresa: 'Globant',        categoria: 'Formación', estado: 'aprobada',  actualizada: 'Hoy',           fechaSolicitud: '12 may 2026', cuposRestantes: 8  },
  { radicado: 'BNF-2026-000115', beneficio: 'Certificación AWS Cloud Practitioner · gratuita',  empresa: 'AWS LATAM',      categoria: 'Formación', estado: 'revision',  actualizada: 'Hace 2 días',   fechaSolicitud: '10 may 2026', cuposRestantes: 22 },
  { radicado: 'BNF-2026-000099', beneficio: 'Bootcamp JavaScript Full Stack · 8 semanas',       empresa: 'MakeItReal',     categoria: 'Formación', estado: 'info',      actualizada: 'Hace 4 días',   fechaSolicitud: '03 may 2026', cuposRestantes: 3  },
  { radicado: 'BNF-2026-000074', beneficio: 'Coworking 3 meses · sede Chapinero',               empresa: 'WeWork Bogotá',  categoria: 'Servicios', estado: 'pendiente', actualizada: 'Hace 1 semana', fechaSolicitud: '28 abr 2026', cuposRestantes: 14 },
  { radicado: 'BNF-2026-000042', beneficio: 'Curso DevOps & Kubernetes · 30 horas',             empresa: 'Platzi',         categoria: 'Formación', estado: 'aprobada',  actualizada: 'Hace 3 semanas',fechaSolicitud: '15 abr 2026', cuposRestantes: 0  },
  { radicado: 'BNF-2026-000031', beneficio: 'Membresía LinkedIn Premium · 12 meses',            empresa: 'LinkedIn LATAM', categoria: 'Carrera',   estado: 'rechazada', actualizada: 'Hace 1 mes',    fechaSolicitud: '02 abr 2026', cuposRestantes: 1  },
  { radicado: 'BNF-2025-008923', beneficio: 'Curso ITIL Foundations · certificación incluida',  empresa: 'Pink Elephant',  categoria: 'Formación', estado: 'cancelada', actualizada: '28 mar 2026',   fechaSolicitud: '20 mar 2026', cuposRestantes: 5  },
  { radicado: 'BNF-2025-008750', beneficio: 'Diplomado Project Management · enfoque PMI',       empresa: 'PMI Bogotá',     categoria: 'Formación', estado: 'aprobada',  actualizada: '15 mar 2026',   fechaSolicitud: '08 mar 2026', cuposRestantes: 0  },
];

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

/** Solicitud de un egresado vista desde la empresa */
export interface SolicitudRecibida {
  radicado: string;
  beneficioId: string;
  beneficio: string;
  egresado: string;
  programa: string;
  email: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  actualizada: string;
  nota?: string;
}

/** Beneficio publicado por la empresa con métricas de gestión */
export interface BeneficioEmpresa extends Beneficio {
  estadoPublicacion: 'activo' | 'vencido' | 'agotado';
  solicitudesRecibidas: number;
  solicitudesPendientes: number;
}

export const EMPRESA_DEMO: Empresa = {
  id: 'e001',
  nombre: 'Globant Colombia',
  nit: '900.123.456-7',
  sector: 'Tecnología',
  sitioWeb: 'www.globant.com',
  email: 'talent@globant.com',
  telefono: '+57 1 234 5678',
  representante: 'Carlos Hernández',
  descripcion: 'Empresa de tecnología especializada en transformación digital y nearshoring. Aliada estratégica del Portal de Egresados UD para programas de formación y empleabilidad.',
  estado: 'aprobada',
  iniciales: 'GC',
};

export const SOLICITUDES_EMPRESA_DEMO: SolicitudRecibida[] = [
  { radicado: 'BNF-2026-000128', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'María Camila Rodríguez', programa: 'Ingeniería de Sistemas',    email: 'mc.rodriguezp@udistrital.edu.co', estado: 'aprobada',  fechaSolicitud: '12 may 2026', actualizada: 'Hoy',            nota: 'Solicitud aprobada. Código de descuento enviado por correo.' },
  { radicado: 'BNF-2026-000130', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Juan Pablo Torres',       programa: 'Ing. Electrónica',       email: 'jp.torres@udistrital.edu.co',    estado: 'revision',  fechaSolicitud: '13 may 2026', actualizada: 'Hace 1 día' },
  { radicado: 'BNF-2026-000135', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Laura Gómez Vargas',       programa: 'Ingeniería Industrial',  email: 'l.gomezv@udistrital.edu.co',     estado: 'pendiente', fechaSolicitud: '15 may 2026', actualizada: 'Hace 2 horas' },
  { radicado: 'BNF-2026-000138', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Sebastián Mora Cárdenas',   programa: 'Lic. en Matemáticas',    email: 'se.mora@udistrital.edu.co',      estado: 'info',      fechaSolicitud: '15 may 2026', actualizada: 'Hoy',            nota: 'Por favor adjunta tu certificado de grado actualizado.' },
  { radicado: 'BNF-2026-000110', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Alejandra Rincón',          programa: 'Ingeniería de Sistemas', email: 'a.rincon@udistrital.edu.co',     estado: 'rechazada', fechaSolicitud: '10 may 2026', actualizada: 'Hace 3 días',    nota: 'Cupo no disponible para el programa seleccionado en este periodo.' },
  { radicado: 'BNF-2026-000098', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Andres Felipe Castro',      programa: 'Ing. Telemática',        email: 'af.castro@udistrital.edu.co',    estado: 'cancelada', fechaSolicitud: '05 may 2026', actualizada: 'Hace 5 días' },
];

export const BENEFICIOS_EMPRESA_DEMO: BeneficioEmpresa[] = [
  { id: 'b001', titulo: 'Maestría en Ciencia de Datos · 40% de descuento', empresa: 'Globant Colombia', isotipo: 'GC', categoria: 'Formación', cuposIniciales: 25, cuposRestantes: 8,  vigenciaHasta: '30 jun 2026', publicado: 'Hace 3 días',    destacado: true,  resumen: 'Cupo limitado para la promoción 2026-II del programa virtual de la Universidad de los Andes, gestionado por Globant Talent Academy.', estadoPublicacion: 'activo',  solicitudesRecibidas: 17, solicitudesPendientes: 3 },
  { id: 'b002', titulo: 'Bootcamp Angular & Java · 6 semanas',             empresa: 'Globant Colombia', isotipo: 'GC', categoria: 'Formación', cuposIniciales: 10, cuposRestantes: 0,  vigenciaHasta: '01 may 2026', publicado: 'Hace 2 meses',   destacado: false, resumen: 'Bootcamp intensivo en Angular 17 y Spring Boot para egresados con experiencia base en desarrollo.',                                        estadoPublicacion: 'agotado', solicitudesRecibidas: 10, solicitudesPendientes: 0 },
  { id: 'b003', titulo: 'Sesión de mentoría en carrera tech · 1 hora',     empresa: 'Globant Colombia', isotipo: 'GC', categoria: 'Carrera',   cuposIniciales: 30, cuposRestantes: 21, vigenciaHasta: '31 dic 2026', publicado: 'Hace 1 semana',  destacado: false, resumen: 'Reunión 1:1 con un Senior o Staff Engineer de Globant para orientación de carrera, revisión de CV y consejos de entrevistas.',               estadoPublicacion: 'activo',  solicitudesRecibidas: 9,  solicitudesPendientes: 1 },
];

export const BENEFICIOS_DEMO: Beneficio[] = [
  { id: 'b001', titulo: 'Maestría en Ciencia de Datos · 40% de descuento',  empresa: 'Globant',       isotipo: 'G',  categoria: 'Formación', cuposIniciales: 25,  cuposRestantes: 8,  vigenciaHasta: '30 jun 2026', publicado: 'Hace 3 días',   destacado: true,  resumen: 'Cupo limitado para la promoción 2026-II del programa virtual de la Universidad de los Andes, gestionado por Globant Talent Academy.' },
  { id: 'b002', titulo: 'Certificación AWS Cloud Practitioner · gratuita',  empresa: 'AWS LATAM',     isotipo: 'A',  categoria: 'Formación', cuposIniciales: 50,  cuposRestantes: 22, vigenciaHasta: '15 ago 2026', publicado: 'Hace 5 días',   destacado: false, resumen: 'Voucher de examen + 40 horas de e-learning para egresados con interés en cloud computing. Inglés intermedio recomendado.' },
  { id: 'b003', titulo: 'Bootcamp JavaScript Full Stack · 8 semanas',       empresa: 'MakeItReal',    isotipo: 'M',  categoria: 'Formación', cuposIniciales: 10,  cuposRestantes: 3,  vigenciaHasta: '20 may 2026', publicado: 'Hoy',           destacado: false, resumen: 'Beca del 70% sobre el valor del bootcamp intensivo. Modalidad live online con mentores de empresas tech.' },
  { id: 'b004', titulo: 'Coworking 3 meses · sede Chapinero',               empresa: 'WeWork Bogotá', isotipo: 'W',  categoria: 'Servicios', cuposIniciales: 20,  cuposRestantes: 14, vigenciaHasta: '31 dic 2026', publicado: 'Hace 1 semana', destacado: false, resumen: 'Acceso a sala compartida y espacios comunes en sede Chapinero, lunes a viernes. Ideal para freelancers e independientes.' },
  { id: 'b005', titulo: 'Curso DevOps & Kubernetes · 30 horas',             empresa: 'Platzi',        isotipo: 'P',  categoria: 'Formación', cuposIniciales: 30,  cuposRestantes: 0,  vigenciaHasta: '10 jun 2026', publicado: 'Hace 2 semanas',destacado: false, resumen: 'Acceso completo a la ruta de aprendizaje DevOps de Platzi durante 6 meses, incluyendo certificación final.' },
  { id: 'b006', titulo: 'Membresía LinkedIn Premium · 12 meses',            empresa: 'LinkedIn LATAM',isotipo: 'Li', categoria: 'Carrera',   cuposIniciales: 30,  cuposRestantes: 1,  vigenciaHasta: '01 jun 2026', publicado: 'Hace 2 semanas',destacado: false, resumen: 'Acceso a InMail, LinkedIn Learning y filtros premium para búsqueda de empleo. Vigencia de un año desde activación.' },
  { id: 'b007', titulo: 'Consulta médica general · sede Mazurén',           empresa: 'Colsanitas',    isotipo: 'C',  categoria: 'Salud',     cuposIniciales: 100, cuposRestantes: 67, vigenciaHasta: '31 jul 2026', publicado: 'Hace 4 días',   destacado: false, resumen: 'Tarifa preferencial para egresados UD en consulta de medicina general. Atención en sedes Mazurén, Chapinero y Norte.' },
  { id: 'b008', titulo: 'Entrada doble · temporada de teatro 2026-II',      empresa: 'Teatro Nacional',isotipo: 'T', categoria: 'Cultura',   cuposIniciales: 40,  cuposRestantes: 31, vigenciaHasta: '30 nov 2026', publicado: 'Hace 6 días',   destacado: false, resumen: 'Una entrada doble por egresado para cualquier función del segundo semestre. Aplica reserva con 72h de anticipación.' },
  { id: 'b009', titulo: 'Diplomado Project Management · enfoque PMI',       empresa: 'PMI Bogotá',    isotipo: 'PM', categoria: 'Formación', cuposIniciales: 15,  cuposRestantes: 6,  vigenciaHasta: '15 sep 2026', publicado: 'Hace 1 semana', destacado: false, resumen: 'Diplomado de 120 horas con preparación para PMP. Modalidad híbrida, viernes en la tarde y sábados.' },
  { id: 'b010', titulo: 'Asesoría legal laboral · 1 hora',                  empresa: 'Legalmente UD', isotipo: 'L',  categoria: 'Servicios', cuposIniciales: 60,  cuposRestantes: 43, vigenciaHasta: '31 dic 2026', publicado: 'Hace 8 días',   destacado: false, resumen: 'Sesión de una hora con abogado laboralista para revisión de contrato, liquidación o reclamación. Modalidad virtual.' },
  { id: 'b011', titulo: 'Curso ITIL Foundations · certificación incluida',  empresa: 'Pink Elephant', isotipo: 'PE', categoria: 'Formación', cuposIniciales: 12,  cuposRestantes: 4,  vigenciaHasta: '30 jun 2026', publicado: 'Hace 10 días',  destacado: false, resumen: 'Curso de 24 horas y voucher de examen ITIL 4 Foundation. Sesiones sábados durante 4 fines de semana.' },
  { id: 'b012', titulo: 'Membresía gimnasio Bodytech · 6 meses',            empresa: 'Bodytech',      isotipo: 'B',  categoria: 'Salud',     cuposIniciales: 25,  cuposRestantes: 17, vigenciaHasta: '31 oct 2026', publicado: 'Hace 2 semanas',destacado: false, resumen: 'Membresía nacional con acceso a todas las sedes incluyendo clases grupales y piscina. Activación inmediata.' },
];
