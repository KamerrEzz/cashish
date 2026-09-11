/** Date helpers for Mexico City personal finance UI (es-MX). */

export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateMx(
  iso: string,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  },
): string {
  return new Intl.DateTimeFormat("es-MX", opts).format(parseDateOnly(iso));
}

export function formatWeekdayDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parseDateOnly(iso));
}

/** Calendar days from `fromIso` (YYYY-MM-DD) to `toIso`. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseDateOnly(fromIso).getTime();
  const to = parseDateOnly(toIso).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function todayLabelMx(todayIso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDateOnly(todayIso));
}

export function relativeDayLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return n === 1 ? "Ayer" : `Hace ${n} días`;
  }
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days <= 7) return `En ${days} días`;
  return `En ${days} días`;
}
