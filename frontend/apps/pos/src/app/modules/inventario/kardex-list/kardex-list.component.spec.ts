import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { MovimientoKardex } from '../producto.types';
import { KardexListComponent } from './kardex-list.component';

describe('KardexListComponent', () => {
  let fixture: ComponentFixture<KardexListComponent>;

  const movimientos: MovimientoKardex[] = [
    {
      id: 2,
      tipo: 'salida',
      cantidad: 3,
      motivo: 'venta',
      sucursal_nombre: 'Centro',
      usuario_nombre: 'Ana',
      stock_resultante: 7,
      fecha: '2026-07-20T10:00:00Z',
    },
    {
      id: 1,
      tipo: 'entrada',
      cantidad: 10,
      motivo: 'compra',
      sucursal_nombre: 'Centro',
      usuario_nombre: 'Ana',
      stock_resultante: 10,
      fecha: '2026-07-19T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KardexListComponent] }).compileComponents();
    fixture = TestBed.createComponent(KardexListComponent);
  });

  it('muestra un mensaje mientras carga', () => {
    fixture.componentInstance.cargando = true;
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cargando kardex');
  });

  it('muestra un mensaje cuando no hay movimientos', () => {
    fixture.componentInstance.movimientos = [];
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin movimientos registrados');
  });

  it('renderiza cada movimiento con tipo, cantidad, motivo y stock resultante', () => {
    fixture.componentInstance.movimientos = movimientos;
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('salida');
    expect(texto).toContain('entrada');
    expect(texto).toContain('venta');
    expect(texto).toContain('compra');
    expect(texto).toContain('7');
    expect(texto).toContain('10');
  });
});
