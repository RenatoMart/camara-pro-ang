/** Utilidades puras de formato. Sin dependencias de React. */

const DEFAULT_LOCALE = 'es-MX';
const DEFAULT_CURRENCY = 'MXN';

/**
 * Los objetos `Intl` se crean una sola vez a nivel de módulo.
 *
 * Instanciarlos es caro: cada `new Intl.NumberFormat(...)` parsea los datos
 * del locale y construye tablas internas. Crearlos dentro de un componente o
 * de un bucle es uno de los costes ocultos más comunes en React Native.
 */
const defaultCurrencyFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  style: 'currency',
  currency: DEFAULT_CURRENCY,
});

const defaultDateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/**
 * Caché para combinaciones de locale/moneda distintas de la predeterminada,
 * para no reconstruir el formateador en cada llamada.
 */
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  if (currency === DEFAULT_CURRENCY && locale === DEFAULT_LOCALE) {
    return defaultCurrencyFormatter.format(amount);
  }

  const cacheKey = `${locale}:${currency}`;
  let formatter = currencyFormatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    currencyFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(amount);
}

export function formatDate(date: Date | string | number): string {
  return defaultDateFormatter.format(new Date(date));
}

/** Recorta un texto añadiendo puntos suspensivos. */
export function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}
