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
}

/** Detalle extendido de un beneficio (en integración real: GET mid /v1/beneficios/:id) */
export interface BeneficioDetalle {
  descripcion: string;
  condiciones: string;
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
  { radicado: 'BNF-2026-000128', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento',  empresa: 'Globant',        categoria: 'Formación', estado: 'aprobada',  actualizada: 'Hoy',           fechaSolicitud: '12 may 2026', cuposRestantes: 8  },
  { radicado: 'BNF-2026-000115', beneficioId: 'b002', beneficio: 'Certificación AWS Cloud Practitioner · gratuita',  empresa: 'AWS LATAM',      categoria: 'Formación', estado: 'revision',  actualizada: 'Hace 2 días',   fechaSolicitud: '10 may 2026', cuposRestantes: 22 },
  { radicado: 'BNF-2026-000099', beneficioId: 'b003', beneficio: 'Bootcamp JavaScript Full Stack · 8 semanas',       empresa: 'MakeItReal',     categoria: 'Formación', estado: 'info',      actualizada: 'Hace 4 días',   fechaSolicitud: '03 may 2026', cuposRestantes: 3  },
  { radicado: 'BNF-2026-000074', beneficioId: 'b004', beneficio: 'Coworking 3 meses · sede Chapinero',               empresa: 'WeWork Bogotá',  categoria: 'Servicios', estado: 'pendiente', actualizada: 'Hace 1 semana', fechaSolicitud: '28 abr 2026', cuposRestantes: 14 },
  { radicado: 'BNF-2026-000042', beneficioId: 'b005', beneficio: 'Curso DevOps & Kubernetes · 30 horas',             empresa: 'Platzi',         categoria: 'Formación', estado: 'aprobada',  actualizada: 'Hace 3 semanas',fechaSolicitud: '15 abr 2026', cuposRestantes: 0  },
  { radicado: 'BNF-2026-000031', beneficioId: 'b006', beneficio: 'Membresía LinkedIn Premium · 12 meses',            empresa: 'LinkedIn LATAM', categoria: 'Carrera',   estado: 'rechazada', actualizada: 'Hace 1 mes',    fechaSolicitud: '02 abr 2026', cuposRestantes: 1  },
  { radicado: 'BNF-2025-008923', beneficioId: 'b011', beneficio: 'Curso ITIL Foundations · certificación incluida',  empresa: 'Pink Elephant',  categoria: 'Formación', estado: 'cancelada', actualizada: '28 mar 2026',   fechaSolicitud: '20 mar 2026', cuposRestantes: 5  },
  { radicado: 'BNF-2025-008750', beneficioId: 'b009', beneficio: 'Diplomado Project Management · enfoque PMI',       empresa: 'PMI Bogotá',     categoria: 'Formación', estado: 'aprobada',  actualizada: '15 mar 2026',   fechaSolicitud: '08 mar 2026', cuposRestantes: 0  },
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
  { radicado: 'BNF-2026-000128', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'María Camila Rodríguez', programa: 'Ingeniería de Sistemas',    facultad: 'Facultad de Ingeniería',    email: 'mc.rodriguezp@udistrital.edu.co', estado: 'aprobada',  fechaSolicitud: '12 may 2026', actualizada: 'Hoy',            nota: 'Solicitud aprobada. Código de descuento enviado por correo.', datosComplementarios: 'Egresada 2023-1. Me interesa el énfasis en Machine Learning; tengo disponibilidad de tiempo completo desde julio. Adjunto promedio de pregrado: 4.3.' },
  { radicado: 'BNF-2026-000130', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Juan Pablo Torres',       programa: 'Ing. Electrónica',          facultad: 'Facultad de Ingeniería',       email: 'jp.torres@udistrital.edu.co',    estado: 'revision',  fechaSolicitud: '13 may 2026', actualizada: 'Hace 1 día',     datosComplementarios: 'Trabajo actualmente como analista de datos junior. Quisiera saber si el descuento aplica también para el plan de pagos semestral.' },
  { radicado: 'BNF-2026-000135', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Laura Gómez Vargas',       programa: 'Ingeniería Industrial',     facultad: 'Facultad de Ingeniería',  email: 'l.gomezv@udistrital.edu.co',     estado: 'pendiente', fechaSolicitud: '15 may 2026', actualizada: 'Hace 2 horas',   datosComplementarios: 'Horario de contacto preferido: después de las 5 p. m. Me gradué en 2022 y llevo 2 años trabajando en mejora de procesos con Python.' },
  { radicado: 'BNF-2026-000138', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Sebastián Mora Cárdenas',   programa: 'Lic. en Matemáticas',       facultad: 'Facultad de Ciencias y Educación',    email: 'se.mora@udistrital.edu.co',      estado: 'info',      fechaSolicitud: '15 may 2026', actualizada: 'Hoy',            nota: 'Por favor adjunta tu certificado de grado actualizado.' },
  { radicado: 'BNF-2026-000110', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Alejandra Rincón',          programa: 'Ingeniería de Sistemas',    facultad: 'Facultad de Ingeniería', email: 'a.rincon@udistrital.edu.co',     estado: 'rechazada', fechaSolicitud: '10 may 2026', actualizada: 'Hace 3 días',    nota: 'Cupo no disponible para el programa seleccionado en este periodo.' },
  { radicado: 'BNF-2026-000098', beneficioId: 'b001', beneficio: 'Maestría en Ciencia de Datos · 40% de descuento', egresado: 'Andres Felipe Castro',      programa: 'Ing. Telemática',           facultad: 'Facultad Tecnológica',        email: 'af.castro@udistrital.edu.co',    estado: 'cancelada', fechaSolicitud: '05 may 2026', actualizada: 'Hace 5 días' },
];

/* Bitácora de estados por radicado (CRUD: GET /v1/historial_solicitud/solicitud/:id).
   Incluye tanto los radicados de la bandeja de empresa como los de "Mis solicitudes"
   del egresado (BNF-2026-000128 aparece en ambas vistas: misma solicitud). */
export const HISTORIAL_DEMO: Record<string, HistorialEntrada[]> = {
  'BNF-2026-000115': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '10 may 2026, 7:55 a. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'revision', actor: 'empresa', fecha: 'Hace 2 días' },
  ],
  'BNF-2026-000099': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '03 may 2026, 6:40 p. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'revision', actor: 'empresa', fecha: '05 may 2026, 9:30 a. m.' },
    { estadoAnterior: 'revision', estadoNuevo: 'info', actor: 'empresa', justificacion: 'Necesitamos validar tu disponibilidad horaria antes de asignar la beca.', fecha: 'Hace 4 días' },
  ],
  'BNF-2026-000074': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '28 abr 2026, 3:12 p. m.' },
  ],
  'BNF-2026-000042': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '15 abr 2026, 10:00 a. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'aprobada', actor: 'empresa', justificacion: 'Acceso a la ruta DevOps activado para tu cuenta.', fecha: 'Hace 3 semanas' },
  ],
  'BNF-2026-000031': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '02 abr 2026, 5:20 p. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'rechazada', actor: 'empresa', justificacion: 'Los códigos promocionales del periodo se agotaron antes de procesar tu solicitud.', fecha: 'Hace 1 mes' },
  ],
  'BNF-2025-008923': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '20 mar 2026, 8:30 a. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'cancelada', actor: 'egresado', justificacion: 'Cancelada por el egresado.', fecha: '28 mar 2026' },
  ],
  'BNF-2025-008750': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '08 mar 2026, 11:45 a. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'revision', actor: 'empresa', fecha: '10 mar 2026, 9:00 a. m.' },
    { estadoAnterior: 'revision', estadoNuevo: 'aprobada', actor: 'empresa', justificacion: 'Cupo confirmado para la cohorte de abril.', fecha: '15 mar 2026' },
  ],
  'BNF-2026-000128': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '12 may 2026, 9:14 a. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'revision', actor: 'empresa', fecha: '13 may 2026, 10:02 a. m.' },
    { estadoAnterior: 'revision', estadoNuevo: 'aprobada', actor: 'empresa', justificacion: 'Solicitud aprobada. Código de descuento enviado por correo.', fecha: 'Hoy, 8:45 a. m.' },
  ],
  'BNF-2026-000130': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '13 may 2026, 4:30 p. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'revision', actor: 'empresa', fecha: 'Hace 1 día' },
  ],
  'BNF-2026-000135': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: 'Hace 2 horas' },
  ],
  'BNF-2026-000138': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '15 may 2026, 11:20 a. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'revision', actor: 'empresa', fecha: '16 may 2026, 9:00 a. m.' },
    { estadoAnterior: 'revision', estadoNuevo: 'info', actor: 'empresa', justificacion: 'Por favor adjunta tu certificado de grado actualizado.', fecha: 'Hoy, 10:12 a. m.' },
  ],
  'BNF-2026-000110': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '10 may 2026, 2:05 p. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'rechazada', actor: 'empresa', justificacion: 'Cupo no disponible para el programa seleccionado en este periodo.', fecha: 'Hace 3 días' },
  ],
  'BNF-2026-000098': [
    { estadoNuevo: 'pendiente', actor: 'egresado', fecha: '05 may 2026, 8:50 a. m.' },
    { estadoAnterior: 'pendiente', estadoNuevo: 'cancelada', actor: 'egresado', justificacion: 'Cancelada por el egresado.', fecha: 'Hace 5 días' },
  ],
};

/* Hilo de mensajes por radicado (CRUD: mensaje_solicitud; solo en REQUIERE_INFO) */
export const MENSAJES_DEMO: Record<string, MensajeHilo[]> = {
  'BNF-2026-000099': [
    { autor: 'empresa', nombre: 'MakeItReal', mensaje: 'Hola María, el bootcamp exige 25 horas semanales en horario 6:30–9:30 p. m. ¿Puedes confirmarnos tu disponibilidad antes del cierre de cohorte?', fecha: 'Hace 4 días' },
  ],
  'BNF-2026-000138': [
    { autor: 'empresa',  nombre: 'Globant Colombia',        mensaje: 'Hola Sebastián, para continuar necesitamos tu certificado de grado actualizado (el documento adjunto está vencido).', fecha: 'Hoy, 10:12 a. m.' },
    { autor: 'egresado', nombre: 'Sebastián Mora Cárdenas', mensaje: 'Claro, lo solicito hoy mismo en la oficina de egresados. ¿Sirve la versión digital con firma electrónica?',          fecha: 'Hoy, 11:40 a. m.' },
  ],
};

export const BENEFICIOS_EMPRESA_DEMO: BeneficioEmpresa[] = [
  { id: 'b001', titulo: 'Maestría en Ciencia de Datos · 40% de descuento', empresa: 'Globant Colombia', isotipo: 'GC', categoria: 'Formación', cuposIniciales: 25, cuposRestantes: 8,  vigenciaHasta: '30 jun 2026', publicado: 'Hace 3 días',    destacado: true,  resumen: 'Cupo limitado para la promoción 2026-II del programa virtual de la Universidad de los Andes, gestionado por Globant Talent Academy.', estadoPublicacion: 'activo',  solicitudesRecibidas: 17, solicitudesPendientes: 3 },
  { id: 'b002', titulo: 'Bootcamp Angular & Java · 6 semanas',             empresa: 'Globant Colombia', isotipo: 'GC', categoria: 'Formación', cuposIniciales: 10, cuposRestantes: 0,  vigenciaHasta: '01 may 2026', publicado: 'Hace 2 meses',   destacado: false, resumen: 'Bootcamp intensivo en Angular 17 y Spring Boot para egresados con experiencia base en desarrollo.',                                        estadoPublicacion: 'agotado', solicitudesRecibidas: 10, solicitudesPendientes: 0 },
  { id: 'b003', titulo: 'Sesión de mentoría en carrera tech · 1 hora',     empresa: 'Globant Colombia', isotipo: 'GC', categoria: 'Carrera',   cuposIniciales: 30, cuposRestantes: 21, vigenciaHasta: '31 dic 2026', publicado: 'Hace 1 semana',  destacado: false, resumen: 'Reunión 1:1 con un Senior o Staff Engineer de Globant para orientación de carrera, revisión de CV y consejos de entrevistas.',               estadoPublicacion: 'activo',  solicitudesRecibidas: 9,  solicitudesPendientes: 1 },
];

/* Detalle (descripcion + condiciones) por beneficio.
   En integración real estos campos vienen de GET mid /v1/beneficios/:id. */
export const BENEFICIO_DETALLES_DEMO: Record<string, BeneficioDetalle> = {
  b001: {
    descripcion: 'Globant Talent Academy, en alianza con la Universidad de los Andes, ofrece un descuento del 40% sobre el valor total de la matrícula de la Maestría en Ciencia de Datos (modalidad virtual, promoción 2026-II). El beneficio cubre los cuatro semestres del programa siempre que el estudiante mantenga promedio igual o superior a 3.8.',
    condiciones: 'Ser egresado titulado de la Universidad Distrital. Acreditar título de pregrado en ingeniería, matemáticas, estadística o áreas afines. Presentar la prueba de admisión regular del programa. El descuento no es acumulable con otras becas ni transferible. El cupo se confirma solo tras la admisión formal al programa.',
  },
  b002: {
    descripcion: 'AWS LATAM entrega un voucher para presentar el examen de certificación AWS Certified Cloud Practitioner sin costo, junto con acceso a 40 horas de e-learning oficial (AWS Skill Builder) durante 6 meses.',
    condiciones: 'Una certificación por egresado. El voucher vence el 15 de agosto de 2026 y no es reembolsable ni transferible. Se recomienda nivel de inglés intermedio (el examen está disponible en inglés, español y portugués). El egresado debe crear su cuenta de AWS Certification con el correo institucional registrado.',
  },
  b003: {
    descripcion: 'MakeItReal otorga una beca del 70% sobre el valor del Bootcamp JavaScript Full Stack: 8 semanas intensivas en modalidad live online (lunes a viernes, 6:30–9:30 p. m.) con mentores de empresas tech de la región. Incluye módulos de Node.js, React y despliegue en la nube.',
    condiciones: 'Disponibilidad de 25 horas semanales. Aprobar el reto técnico de admisión (lógica de programación básica). El pago del 30% restante puede diferirse a 3 cuotas. La beca se pierde si la asistencia cae por debajo del 80%.',
  },
  b004: {
    descripcion: 'WeWork Bogotá ofrece una membresía de coworking por 3 meses en la sede Chapinero: puesto en sala compartida, acceso a salas de reuniones (4 horas/mes), internet de alta velocidad y espacios comunes, de lunes a viernes en horario de oficina.',
    condiciones: 'Beneficio para egresados con emprendimiento activo o trabajo independiente (se solicita RUT o certificación). Un cupo por persona, no renovable. El acceso inicia el primer día hábil del mes siguiente a la aprobación. Sujeto a disponibilidad de puestos en la sede.',
  },
  b005: {
    descripcion: 'Platzi habilita la ruta completa de aprendizaje DevOps (30 horas de contenido core, incluyendo Docker, Kubernetes, CI/CD y observabilidad) con acceso total a la plataforma durante 6 meses y certificado digital al completarla.',
    condiciones: 'Cuenta personal de Platzi creada con el correo registrado en el portal de egresados. La ruta debe completarse dentro de los 6 meses de vigencia. El certificado final requiere aprobar las evaluaciones de cada curso de la ruta.',
  },
  b006: {
    descripcion: 'LinkedIn LATAM otorga 12 meses de LinkedIn Premium Career: mensajes InMail, visibilidad de quién vio tu perfil, filtros avanzados de búsqueda de empleo y acceso completo a LinkedIn Learning.',
    condiciones: 'Perfil de LinkedIn activo con el correo registrado. La membresía se activa mediante código promocional con vigencia de 30 días desde su envío; una vez activada, dura 12 meses. No aplica para cuentas que ya tengan Premium activo.',
  },
  b007: {
    descripcion: 'Colsanitas ofrece tarifa preferencial en consulta de medicina general para egresados UD en las sedes Mazurén, Chapinero y Norte, con agendamiento prioritario en franja de 7 a. m. a 7 p. m.',
    condiciones: 'Presentar documento de identidad y carné o certificado de egresado al momento de la cita. La tarifa preferencial aplica solo para consulta de medicina general (no incluye exámenes ni especialistas). Agendamiento con mínimo 24 horas de anticipación.',
  },
  b008: {
    descripcion: 'El Teatro Nacional entrega una entrada doble por egresado para cualquier función de la temporada 2026-II en sus salas de Bogotá, incluyendo estrenos y obras invitadas.',
    condiciones: 'Reserva obligatoria con mínimo 72 horas de anticipación a través del canal indicado al aprobar la solicitud. Sujeto a disponibilidad de sala. La entrada doble es válida para una única función y no es canjeable por dinero.',
  },
  b009: {
    descripcion: 'PMI Bogotá ofrece el Diplomado en Project Management (120 horas, enfoque PMI/PMBOK 7) en modalidad híbrida: viernes en la tarde virtual y sábados presencial. Incluye simulacros y preparación para la certificación PMP.',
    condiciones: 'Acreditar mínimo 1 año de experiencia profesional. Asistencia mínima del 85% para obtener el certificado. Las 35 horas de contacto requeridas para presentar el examen PMP quedan certificadas al aprobar el diplomado. El examen PMP se paga aparte.',
  },
  b010: {
    descripcion: 'Legalmente UD ofrece una sesión virtual de una hora con abogado laboralista para revisión de contrato laboral, liquidación, acoso laboral o reclamaciones ante el empleador, con concepto escrito posterior a la sesión.',
    condiciones: 'Una sesión por egresado por semestre. Los documentos a revisar deben enviarse con 48 horas de anticipación. El concepto escrito es orientativo y no constituye representación judicial.',
  },
  b011: {
    descripcion: 'Pink Elephant dicta el curso oficial ITIL 4 Foundation (24 horas, sábados durante 4 fines de semana) e incluye el voucher del examen de certificación de PeopleCert.',
    condiciones: 'Asistencia mínima del 75% para habilitar el voucher de examen. El examen debe presentarse dentro de los 3 meses siguientes al cierre del curso. Material oficial en español incluido.',
  },
  b012: {
    descripcion: 'Bodytech otorga una membresía nacional de 6 meses con acceso a todas las sedes del país, clases grupales, piscina y zonas húmedas, con activación inmediata tras la aprobación.',
    condiciones: 'Membresía personal e intransferible. Requiere valoración física inicial en la sede de activación. No incluye servicios de entrenador personalizado. La congelación de la membresía aplica máximo 15 días por causa médica certificada.',
  },
};

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
