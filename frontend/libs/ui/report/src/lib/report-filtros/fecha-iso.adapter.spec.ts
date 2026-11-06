import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { PROVEEDORES_FECHA_ES_MX } from './fecha-iso.adapter';

describe('FechaISOAdapter', () => {
  let adapter: DateAdapter<Date>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: PROVEEDORES_FECHA_ES_MX });
    adapter = TestBed.inject(DateAdapter) as DateAdapter<Date>;
  });

  it('interpreta YYYY-MM-DD como fecha local, sin desfase de zona', () => {
    const fecha = adapter.parse('2026-11-03', 'YYYY-MM-DD') as Date;

    expect([fecha.getFullYear(), fecha.getMonth(), fecha.getDate()]).toEqual([2026, 10, 3]);
  });

  it('formatea y deserializa el mismo dia en YYYY-MM-DD', () => {
    const fecha = new Date(2026, 10, 5, 23, 30);

    expect(adapter.format(fecha, 'YYYY-MM-DD')).toBe('2026-11-05');
    expect(adapter.deserialize('2026-11-05')?.getDate()).toBe(5);
  });
});
