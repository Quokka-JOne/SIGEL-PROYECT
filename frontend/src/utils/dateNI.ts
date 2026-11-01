/**
 * Utilidades de fecha para el frontend — Zona horaria Nicaragua (UTC-6)
 *
 * new Date().toISOString() siempre retorna UTC.
 * Cuando el usuario está en Nicaragua (UTC-6) y son las 7 PM del 31 de oct,
 * toISOString() retorna "2026-11-01T01:xx:xx.000Z" → fecha incorrecta.
 *
 * Usar estas funciones en su lugar.
 */

/**
 * Retorna la fecha de hoy como "YYYY-MM-DD" en la zona horaria local del navegador.
 * Funciona correctamente en Nicaragua (UTC-6) y cualquier otra zona.
 */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna la fecha de hace N días (en hora local) como "YYYY-MM-DD".
 */
export function localDateStringDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateString(d);
}

/**
 * Formatea un string ISO o Date a fecha legible en español Nicaragua.
 * Ej: "2026-10-31T19:00:00.000Z" → "31/10/2026"
 */
export function formatDateNI(dateStr: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString('es-NI', {
    timeZone: 'America/Managua',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/**
 * Formatea un string ISO o Date a hora legible en español Nicaragua.
 * Ej: "2026-11-01T01:30:00.000Z" → "7:30 PM" (hora Nicaragua)
 */
export function formatTimeNI(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleTimeString('es-NI', {
    timeZone: 'America/Managua',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea un string ISO o Date a fecha+hora completa en Nicaragua.
 */
export function formatDateTimeNI(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return date.toLocaleString('es-NI', {
    timeZone: 'America/Managua',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
