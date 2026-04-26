const pad = (n: number) => String(n).padStart(2, "0");

/** Data de calendário de hoje no fuso local, no formato "YYYY-MM-DD". */
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Converte "YYYY-MM-DD" em Date ancorado ao meio-dia UTC da data de calendário.
 * Meio-dia UTC mantém a data estável em qualquer fuso (de -12 a +14) e atravessa
 * transições de horário de verão sem migrar para o dia anterior/seguinte.
 */
export function parseCalendarDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error(`Data inválida: ${iso}`);
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0));
}

/** Extrai a data de calendário (componentes UTC) como "YYYY-MM-DD". */
export function calendarDateToISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Formata uma data de calendário como "dd/mm/aaaa" (pt-BR), sem slip de fuso. */
export function formatCalendarDateBR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
