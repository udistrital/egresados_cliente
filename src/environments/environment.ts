/* ============================================================
   Environment · desarrollo local
   ⚠️  Los valores de TOKEN los entrega OATI.
       Reemplaza CLIENTE_ID y REDIRECT_URL cuando los tengas.
   ============================================================ */
export const environment = {
  production: false,

  TOKEN: {
    AUTORIZATION_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize',
    // Client ID propio del modulo, entregado por OATI (D-6).
    CLIENTE_ID: 'BEar4wMvpm_IBLa6vfPi8NnX4zYa',
    RESPONSE_TYPE: 'id_token token',
    SCOPE: 'openid email role documento',
    REDIRECT_URL: 'https://pruebasegresados.portaloas.udistrital.edu.co', // ← debe coincidir exactamente con lo registrado en WSO2
    SIGN_OUT_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oidc/logout',
    SIGN_OUT_REDIRECT_URL: 'https://pruebasegresados.portaloas.udistrital.edu.co',
    SIGN_OUT_APPEND_TOKEN: 'true',
    AUTENTICACION_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  },

  API_GET_IDENTIFICATION: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  DATOS_IDENTIFICACION_TERCERO_ENDPOINT: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1/datos_identificacion',
  TERCEROS_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1',

  // Servicios para el perfil académico del egresado (C-2a)
  SGA_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/sga_mid/v1',
  PROYECTO_ACADEMICO_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/proyecto_academico_crud/v1',

  // MID de Beneficios Egresados. En local (ng serve contra el MID en :8081) reemplazar
  // por 'http://localhost:8081/v1'; URL de despliegue (ambiente de pruebas) confirmada
  // por OATI. Sin slash final: el service arma las rutas como `${base}/beneficios`, etc.
  BENEFICIOS_MID: 'https://pruebasapi2.intranetoas.udistrital.edu.co/egresados_mid/v1',

  // Roles de WSO2 que habilitan cada vista.
  // ← Confirmar con OATI los nombres reales de los roles (D-5/D-7) y ampliar aquí.
  ROLES_EGRESADO: ['egresado', 'EGRESADO'],
  ROLES_EMPRESA: ['empresa', 'EMPRESA'],
};
