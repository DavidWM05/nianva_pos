export const VACIO = '—';

export function comoNumero(valor: unknown): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  if (typeof valor !== 'string') {
    return null;
  }

  const texto = valor.trim();

  if (texto === '' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(texto)) {
    return null;
  }

  const numero = Number(texto);

  return Number.isFinite(numero) ? numero : null;
}

export function formatearNumero(valor: number, locale: string, decimales = 0, minimos = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: minimos,
    maximumFractionDigits: decimales,
    useGrouping: true,
  }).format(valor);
}

export function fechaSolo(valor: string): string | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);

  if (! partes) {
    return null;
  }

  const [, anio, mes, dia] = partes;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));

  if (
    fecha.getUTCFullYear() !== Number(anio)
    || fecha.getUTCMonth() !== Number(mes) - 1
    || fecha.getUTCDate() !== Number(dia)
  ) {
    return null;
  }

  return `${dia}/${mes}/${anio}`;
}

export function fechaEnZona(valor: string | number | Date): Date | null {
  const fecha = valor instanceof Date ? valor : new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function partesFecha(fecha: Date, locale: string, zonaHoraria: string, conHora: boolean): Record<string, string> {
  const partes = new Intl.DateTimeFormat(locale, {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(conHora ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}),
  }).formatToParts(fecha);

  return Object.fromEntries(partes.filter((parte) => parte.type !== 'literal').map((parte) => [parte.type, parte.value]));
}
