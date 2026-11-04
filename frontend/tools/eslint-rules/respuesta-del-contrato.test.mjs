import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import { RULE_NAME, rule } from './respuesta-del-contrato.mjs';

const linter = new Linter();
const config = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { nianva: { rules: { [RULE_NAME]: rule } } },
    rules: { [`nianva/${RULE_NAME}`]: 'error' },
  },
];

const IMPORTS = `
import type { CuerpoDe, GastoResource, RespuestaDe } from '@nianva/api-contrato';
import { Gasto } from './gasto.types';
`;

function lint(cuerpo) {
  return linter.verify(`${IMPORTS}\n${cuerpo}`, config, { filename: 'gasto.service.ts' });
}

describe('respuesta-del-contrato', () => {
  it('acepta tipos del contrato', () => {
    expect(lint("this.http.get<RespuestaDe<'/gastos', 'get'>>(urlApi('/gastos'));")).toEqual([]);
    expect(lint("this.http.post<RespuestaDe<'/gastos', 'post'>>(urlApi('/gastos'), cuerpo);")).toEqual([]);
    expect(lint("this.http.get<RespuestaDe<'/gastos', 'get'>['data']>(urlApi('/gastos'));")).toEqual([]);
    expect(lint("this.http.get<GastoResource[]>(urlApi('/gastos'));")).toEqual([]);
    expect(lint("this.http.get<Partial<GastoResource>>(urlApi('/gastos'));")).toEqual([]);
    expect(lint("this.http.delete<void>(urlApi('/gastos/1'));")).toEqual([]);
  });

  it('rechaza una interfaz escrita a mano o un objeto literal', () => {
    expect(lint("this.http.get<Gasto[]>(urlApi('/gastos'));")).toHaveLength(1);
    expect(lint("this.http.get<{ data: Gasto[] }>(urlApi('/gastos'));")).toHaveLength(1);
    expect(lint("this.http.get<{ data: GastoResource[] }>(urlApi('/gastos'));")).toHaveLength(1);
    expect(lint("this.http.post<{ status: string }>(urlApi('/gastos'), {});")).toHaveLength(1);
    expect(lint("this.http.get<Partial<Gasto>>(urlApi('/gastos'));")).toHaveLength(1);
  });

  it('dice que tipo no viene del contrato', () => {
    const [error] = lint("this.http.get<Gasto[]>(urlApi('/gastos'));");

    expect(error.message).toContain('"Gasto"');
  });

  it('rechaza la llamada sin tipo', () => {
    expect(lint("this.http.get(urlApi('/gastos'));")).toHaveLength(1);
  });

  it('no revisa las rutas de sesion ni otros objetos con get', () => {
    expect(lint("this.http.post<LoginResponse>(urlSesion('/login'), {});")).toEqual([]);
    expect(lint("this.mapa.get<Gasto>('clave');")).toEqual([]);
    expect(lint("params.get('id');")).toEqual([]);
  });

  it('un tipo con el mismo nombre importado de otro lado no cuenta como contrato', () => {
    const codigo = "import type { RespuestaDe } from './propio';\nthis.http.get<RespuestaDe<'/gastos', 'get'>>(urlApi('/gastos'));";

    expect(linter.verify(codigo, config, { filename: 'otro.service.ts' })).toHaveLength(1);
  });
});
