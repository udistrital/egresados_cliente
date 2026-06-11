/* ============================================================
   Environment · producción
   ⚠️  Los valores marcados con ← los entrega OATI (D-6: CLIENTE_ID
       propio del módulo; URL del MID tras el gateway /apioas/).
   ============================================================ */
export const environment = {
  production: true,

  // En producción siempre se integra contra los servicios reales.
  DEMO_MODE: false,
  DEMO_ROL: 'egresado' as 'empresa' | 'egresado',

  TOKEN: {
    AUTORIZATION_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize',
    CLIENTE_ID: '', // ← CLIENTE_ID propio del módulo (D-6, lo entrega OATI)
    RESPONSE_TYPE: 'id_token token',
    SCOPE: 'openid email role documento',
    REDIRECT_URL: '', // ← URL pública del micro-frontend registrada en WSO2
    SIGN_OUT_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oidc/logout',
    SIGN_OUT_REDIRECT_URL: '', // ← misma URL pública
    SIGN_OUT_APPEND_TOKEN: 'true',
    AUTENTICACION_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  },

  API_GET_IDENTIFICATION: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  DATOS_IDENTIFICACION_TERCERO_ENDPOINT: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1/datos_identificacion',
  TERCEROS_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1',

  // Servicios para el perfil académico del egresado (C-2a)
  SGA_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/sga_mid/v1',
  PROYECTO_ACADEMICO_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/proyecto_academico_crud/v1',

  // ← Ruta del MID en el gateway (la asigna OATI al desplegar, patrón /apioas/<servicio>/v1)
  BENEFICIOS_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/beneficios_egresados_mid/v1',

  ROLES_EGRESADO: ['egresado', 'EGRESADO'],
  ROLES_EMPRESA: ['empresa', 'EMPRESA'],
};
