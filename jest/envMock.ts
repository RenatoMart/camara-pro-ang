/**
 * Reemplazo del módulo virtual `@env` durante los tests.
 *
 * Babel no corre el plugin de dotenv en Jest con la misma configuración, así
 * que `jest.config.js` mapea `@env` a este archivo.
 */
export const APP_ENV = 'development';
export const API_URL = 'http://localhost:3000';
export const API_TIMEOUT_MS = '5000';
