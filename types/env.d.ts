/**
 * Tipado del módulo virtual `@env` que genera `react-native-dotenv`.
 *
 * Cada variable declarada aquí debe existir también en `.env.example` y en
 * `.env` con un valor no vacío: el plugin corre en modo `safe` y falla el
 * build si falta alguna.
 */
declare module '@env' {
  export const APP_ENV: 'development' | 'staging' | 'production';
  export const API_URL: string;
  export const API_TIMEOUT_MS: string;
}
