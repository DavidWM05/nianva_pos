import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * API-07 (F4-9): las operaciones de dinero aceptan `Idempotency-Key`, y cuando todas las pantallas
 * la manden pasa a ser obligatoria. Los servicios de libs/domain la reciben como parametro
 * `llaveIdempotencia`; toda llamada desde apps/pos a uno de esos metodos debe pasarla (la de un
 * IntentoOperacion). Los metodos salen de libs/domain: uno nuevo queda cubierto sin tocar este
 * spec.
 */
const APP = join(process.cwd(), 'apps', 'pos', 'src', 'app');
const DOMINIO = join(process.cwd(), 'libs', 'domain');

function archivos(raiz: string, filtro: (ruta: string) => boolean): string[] {
  return readdirSync(raiz, { recursive: true, encoding: 'utf8' })
    .filter((ruta) => filtro(ruta) && !ruta.includes('node_modules'))
    .map((ruta) => join(raiz, ruta));
}

/** Parte `texto` por las comas de primer nivel (fuera de parentesis, llaves, corchetes y genericos). */
function partirArgumentos(texto: string): string[] {
  const partes: string[] = [];
  let nivel = 0;
  let actual = '';
  for (const caracter of texto) {
    if ('([{<'.includes(caracter)) nivel += 1;
    if (')]}>'.includes(caracter)) nivel -= 1;
    if (caracter === ',' && nivel === 0) {
      partes.push(actual);
      actual = '';
      continue;
    }
    actual += caracter;
  }
  if (actual.trim() !== '') partes.push(actual);

  return partes.map((parte) => parte.trim()).filter((parte) => parte !== '');
}

/** El texto entre el parentesis que abre en `inicio` y el que lo cierra. */
function entreParentesis(texto: string, inicio: number): string {
  let nivel = 0;
  for (let i = inicio; i < texto.length; i += 1) {
    if (texto[i] === '(') nivel += 1;
    if (texto[i] === ')') {
      nivel -= 1;
      if (nivel === 0) return texto.slice(inicio + 1, i);
    }
  }

  return texto.slice(inicio + 1);
}

/** Clase de servicio -> metodo -> posicion del parametro `llaveIdempotencia`. */
function metodosConLlave(): Map<string, Map<string, number>> {
  const mapa = new Map<string, Map<string, number>>();
  for (const archivo of archivos(DOMINIO, (ruta) => ruta.endsWith('.service.ts'))) {
    const texto = readFileSync(archivo, 'utf8');
    const clase = /export class (\w+)/.exec(texto)?.[1];
    if (!clase) continue;
    for (const coincidencia of texto.matchAll(/^ {2}(\w+)\(/gm)) {
      const parametros = partirArgumentos(entreParentesis(texto, (coincidencia.index ?? 0) + coincidencia[0].length - 1));
      const posicion = parametros.findIndex((parametro) => parametro.startsWith('llaveIdempotencia'));
      if (posicion >= 0) {
        mapa.set(clase, (mapa.get(clase) ?? new Map()).set(coincidencia[1], posicion));
      }
    }
  }

  return mapa;
}

/** `archivo: Clase.metodo` de cada llamada desde la app que no pasa la llave. */
function llamadasSinLlave(): string[] {
  const conLlave = metodosConLlave();
  const faltantes: string[] = [];
  for (const archivo of archivos(APP, (ruta) => ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts'))) {
    const texto = readFileSync(archivo, 'utf8');
    for (const [, variable, clase] of texto.matchAll(/(\w+)\s*=\s*inject\((\w+)\)/g)) {
      const metodos = conLlave.get(clase);
      if (!metodos) continue;
      for (const llamada of texto.matchAll(new RegExp(`this\\.${variable}\\s*\\.\\s*(\\w+)\\(`, 'g'))) {
        const posicion = metodos.get(llamada[1]);
        if (posicion === undefined) continue;
        const argumentos = partirArgumentos(entreParentesis(texto, (llamada.index ?? 0) + llamada[0].length - 1));
        if (argumentos.length <= posicion) {
          faltantes.push(`${relative(APP, archivo).split(sep).join('/')}: ${clase}.${llamada[1]}`);
        }
      }
    }
  }

  return faltantes.sort();
}

describe('Idempotency-Key en las pantallas de dinero (API-07)', () => {
  it('encuentra en libs/domain los metodos que reciben la llave', () => {
    const conLlave = metodosConLlave();

    expect(conLlave.get('VentaService')?.get('registrar')).toBe(1);
    expect(conLlave.get('CajaService')?.get('cerrar')).toBe(2);
    expect(conLlave.get('ApartadoService')?.has('registrarAbono')).toBe(true);
  });

  it('toda llamada desde apps/pos a esos metodos pasa la llave', () => {
    expect(llamadasSinLlave()).toEqual([]);
  });
});
