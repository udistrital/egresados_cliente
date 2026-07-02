/* ============================================================
   Environment · desarrollo local
   ⚠️  Los valores de TOKEN los entrega OATI.
       Reemplaza CLIENTE_ID y REDIRECT_URL cuando los tengas.
   ============================================================ */
export const environment = {
  production: false,

  TOKEN: {
    AUTORIZATION_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oauth2/authorize',
    // ← Reemplazar con el Client ID que entregue OATI para este proyecto.
    //   Para desarrollo local temporal se puede usar el del SGA (mismo redirect_uri localhost:4200):
    CLIENTE_ID: 'e36v1MPQk2jbz9KM4SmKhk8Cyw0a',
    RESPONSE_TYPE: 'id_token token',
    SCOPE: 'openid email role documento',
    REDIRECT_URL: 'http://localhost:4200/', // ← debe coincidir exactamente con lo registrado en WSO2
    SIGN_OUT_URL: 'https://autenticacion.portaloas.udistrital.edu.co/oidc/logout',
    SIGN_OUT_REDIRECT_URL: 'http://localhost:4200/',
    SIGN_OUT_APPEND_TOKEN: 'true',
    AUTENTICACION_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  },

  API_GET_IDENTIFICATION: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/autenticacion_mid/v1/token/userRol',
  DATOS_IDENTIFICACION_TERCERO_ENDPOINT: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1/datos_identificacion',
  TERCEROS_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/terceros_crud/v1',

  // Servicios para el perfil académico del egresado (C-2a)
  SGA_MID: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/sga_mid/v1',
  PROYECTO_ACADEMICO_SERVICE: 'https://autenticacion.portaloas.udistrital.edu.co/apioas/proyecto_academico_crud/v1',

  // MID de Beneficios Egresados. En local corre en :8081 (conf/app.conf del MID);
  // en despliegue OATI lo expone tras el gateway /apioas/ (ver environment.prod.ts).
  BENEFICIOS_MID: 'http://localhost:8081/v1',

  // Roles de WSO2 que habilitan cada vista.
  // ← Confirmar con OATI los nombres reales de los roles (D-5/D-7) y ampliar aquí.
  ROLES_EGRESADO: ['egresado', 'EGRESADO'],
  ROLES_EMPRESA: ['empresa', 'EMPRESA'],
};
