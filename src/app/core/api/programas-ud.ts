/* ============================================================
   Fallback LOCAL de carrera/facultad (C-2a) derivado del código
   estudiantil UD. Solo se usa cuando la cadena institucional
   (consultar_persona → proyecto_academico) no trae el dato — la
   fuente institucional siempre tiene prioridad.

   Estructura del código (11-12 dígitos): [AAAA][S][CCC][XXX...]
   AAAA = año de ingreso · S = semestre · CCC (dígitos [5:8]) =
   código de la carrera · XXX = consecutivo. Es la MISMA regla con
   la que sga_mid arma el programa (derechos_pecuniarios.go:827).
   ============================================================ */

export interface ProgramaUD {
  programa: string;
  facultad: string;
}

const ING = 'Facultad de Ingeniería';
const AMB = 'Facultad del Medio Ambiente y Recursos Naturales';
const CIE = 'Facultad de Ciencias y Educación';
const ART = 'Facultad de Artes - ASAB';
const TEC = 'Facultad Tecnológica';

/** Mapeo CCC → carrera/facultad (pregrados; ampliar según se necesite). */
const PROGRAMAS_POR_CODIGO: Record<string, ProgramaUD> = {
  // Facultad de Ingeniería
  '005': { programa: 'Ingeniería Electrónica', facultad: ING },
  '015': { programa: 'Ingeniería Industrial', facultad: ING },
  '020': { programa: 'Ingeniería de Sistemas', facultad: ING },
  '025': { programa: 'Ingeniería Catastral y Geodesia', facultad: ING },
  // Facultad del Medio Ambiente y Recursos Naturales
  '090': { programa: 'Ingeniería Forestal', facultad: AMB },
  '095': { programa: 'Ingeniería Topográfica', facultad: AMB },
  '180': { programa: 'Ingeniería Ambiental', facultad: AMB },
  '780': { programa: 'Ingeniería Ambiental', facultad: AMB },
  '181': { programa: 'Ingeniería Sanitaria', facultad: AMB },
  '781': { programa: 'Ingeniería Sanitaria', facultad: AMB },
  '185': { programa: 'Administración Ambiental', facultad: AMB },
  '785': { programa: 'Administración Ambiental', facultad: AMB },
  '195': { programa: 'Administración Deportiva', facultad: AMB },
  // Facultad de Ciencias y Educación
  '040': { programa: 'Licenciatura en Ciencias Sociales', facultad: CIE },
  '045': { programa: 'Licenciatura en Física', facultad: CIE },
  '050': { programa: 'Licenciatura en Matemáticas', facultad: CIE },
  '055': { programa: 'Licenciatura en Biología', facultad: CIE },
  '060': { programa: 'Licenciatura en Química', facultad: CIE },
  '120': { programa: 'Licenciatura en Educación Infantil', facultad: CIE },
  '130': { programa: 'Licenciatura en Humanidades y Lengua Castellana', facultad: CIE },
  '135': { programa: 'Licenciatura en Educación Básica con Énfasis en Inglés', facultad: CIE },
  // Facultad de Artes - ASAB
  '140': { programa: 'Artes Plásticas y Visuales', facultad: ART },
  '150': { programa: 'Artes Escénicas', facultad: ART },
  '160': { programa: 'Artes Musicales', facultad: ART },
  '170': { programa: 'Arte Danzario', facultad: ART },
  // Facultad Tecnológica (6xx = Tecnologías, 3xx = Ingenierías por ciclos)
  '673': { programa: 'Tecnología en Sistematización de Datos', facultad: TEC },
  '373': { programa: 'Ingeniería en Telemática', facultad: TEC },
  '674': { programa: 'Tecnología en Construcciones Civiles', facultad: TEC },
  '374': { programa: 'Ingeniería Civil', facultad: TEC },
  '675': { programa: 'Tecnología en Mecánica Industrial', facultad: TEC },
  '375': { programa: 'Ingeniería Mecánica', facultad: TEC },
  '672': { programa: 'Tecnología en Electrónica Industrial', facultad: TEC },
  '372': { programa: 'Ingeniería de Control', facultad: TEC },
  '671': { programa: 'Tecnología Industrial', facultad: TEC },
  '371': { programa: 'Ingeniería de Producción', facultad: TEC },
};

/**
 * Deriva carrera/facultad del código estudiantil (dígitos [5:8]).
 * null si el código no tiene la forma esperada o el CCC no está mapeado —
 * NUNCA lanza: el llamador degrada a mostrar un guion.
 */
export function programaDesdeCodigo(codigoEstudiantil?: string): ProgramaUD | null {
  const codigo = (codigoEstudiantil ?? '').trim();
  if (!/^\d{11,12}$/.test(codigo)) return null;
  return PROGRAMAS_POR_CODIGO[codigo.slice(5, 8)] ?? null;
}
