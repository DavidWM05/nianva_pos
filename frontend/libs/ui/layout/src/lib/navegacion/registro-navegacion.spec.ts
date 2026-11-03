import { describe, expect, it } from 'vitest';

import { buscarEntrada, problemaDeNombre } from './registro-navegacion';

describe('problemaDeNombre', () => {
  it('acepta mayuscula solo al inicio', () => {
    expect(problemaDeNombre('Cuentas por cobrar')).toBeNull();
    expect(problemaDeNombre('Productos')).toBeNull();
  });

  it('acepta siglas en mayusculas', () => {
    expect(problemaDeNombre('Antigüedad de CxC')).toBeNull();
    expect(problemaDeNombre('CRM')).toBeNull();
  });

  it('rechaza una palabra con mayuscula a mitad del nombre', () => {
    expect(problemaDeNombre('Unidades de Medida')).toContain('Medida');
  });

  it('rechaza "Gestion de"', () => {
    expect(problemaDeNombre('Gestión de productos')).toContain('Gestión de');
  });

  it('rechaza un nombre en minuscula', () => {
    expect(problemaDeNombre('productos')).toContain('mayúscula');
  });
});

describe('buscarEntrada', () => {
  it('encuentra por clave', () => {
    const registro = [{ clave: 'crm', ruta: 'crm', nombre: 'Clientes', icono: 'pi pi-users' }];

    expect(buscarEntrada(registro, 'crm')?.nombre).toBe('Clientes');
    expect(buscarEntrada(registro, 'otra')).toBeUndefined();
  });
});
