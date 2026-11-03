import { describe, expect, it } from 'vitest';

import { CambioListado, ColumnaListado, parametrosListado } from './listado.types';

interface Fila {
  id: number;
  nombre: string;
  estado: 'activo' | 'inactivo';
  precio: number;
  existencias: number;
}

const cambio: CambioListado = {
  page: 2,
  rows: 50,
  sortField: 'nombre',
  sortOrder: 'asc',
};

describe('parametrosListado', () => {
  it('traduce el cambio de pagina al query de API-06', () => {
    expect(parametrosListado(cambio)).toEqual({
      page: 2,
      rows: 50,
      sort_field: 'nombre',
      sort_order: 'asc',
    });
  });

  it('omite orden y filtros vacios o nulos', () => {
    expect(
      parametrosListado(
        { page: 1, rows: 25, sortField: null, sortOrder: null },
        { q: '  playera  ', filtro_estado: '', filtro_activo: null, filtro_nombre: undefined },
      ),
    ).toEqual({ page: 1, rows: 25, q: 'playera' });
  });

  it('incluye filtros con valor y convierte booleanos a texto', () => {
    expect(
      parametrosListado(cambio, { q: 'playera', filtro_activo: true, filtro_stock: 0 }),
    ).toEqual({
      page: 2,
      rows: 50,
      sort_field: 'nombre',
      sort_order: 'asc',
      q: 'playera',
      filtro_activo: 'true',
      filtro_stock: 0,
    });
  });

  it('acota page y rows al rango valido', () => {
    expect(parametrosListado({ ...cambio, page: 0, rows: 500 })).toMatchObject({
      page: 1,
      rows: 100,
    });
  });
});

describe('tipos de columna', () => {
  it('acepta una columna valida por tipo', () => {
    const columnas: ColumnaListado<Fila>[] = [
      { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', apoyo: 'id' },
      { tipo: 'dinero', campo: 'precio', encabezado: 'Precio', ordenable: true },
      { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'venta' },
      { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] },
    ];

    expect(columnas).toHaveLength(4);
  });

  it('rechaza un campo que no existe en la fila', () => {
    // @ts-expect-error campo inexistente
    const columna: ColumnaListado<Fila> = { tipo: 'texto', campo: 'inexistente', encabezado: 'X' };

    expect(columna).toBeDefined();
  });

  it('rechaza un tipo de columna desconocido', () => {
    // @ts-expect-error tipo invalido
    const columna: ColumnaListado<Fila> = { tipo: 'imagen', campo: 'nombre', encabezado: 'Nombre' };

    expect(columna).toBeDefined();
  });
});
