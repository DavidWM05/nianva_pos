import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from '@nianva/ui-shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductoVariante } from '../producto.types';
import { VariantesListComponent } from './variantes-list.component';

describe('VariantesListComponent', () => {
  let fixture: ComponentFixture<VariantesListComponent>;

  const variantes: ProductoVariante[] = [
    {
      id: 1,
      producto_id: 1,
      talla: 'M',
      color: 'Azul',
      codigo_barras: 'COD-001',
      activo: true,
      stock: [
        { sucursal_id: 1, sucursal_nombre: 'Centro', stock_actual: 5, stock_minimo: 2 },
        { sucursal_id: 2, sucursal_nombre: 'Norte', stock_actual: 0, stock_minimo: 3 },
      ],
    },
    {
      id: 2,
      producto_id: 1,
      talla: 'L',
      color: 'Azul',
      codigo_barras: null,
      activo: true,
      stock: [],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariantesListComponent],
      providers: [{ provide: ConfirmDialogService, useValue: { confirm: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(VariantesListComponent);
    fixture.componentInstance.variantes = variantes;
    fixture.componentInstance.puedeEditar = true;
    fixture.componentInstance.puedeDesactivar = true;
    fixture.detectChanges();
  });

  it('renderiza cada variante con su etiqueta y su stock por sucursal', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('M / Azul');
    expect(texto).toContain('Centro');
    expect(texto).toContain('Norte');
    expect(texto).toContain('COD-001');
  });

  it('muestra un aviso cuando una variante todavia no tiene stock registrado', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Sin movimientos de stock registrados');
  });

  it('marca en rojo las filas de stock en o por debajo del minimo', () => {
    const filaBaja = (fixture.nativeElement as HTMLElement).querySelector('.variantes-list__stock-bajo');
    expect(filaBaja?.textContent).toContain('Norte');
  });

  it('emite verKardex al presionar el boton Kardex de una variante', () => {
    let emitida: ProductoVariante | undefined;
    fixture.componentInstance.verKardex.subscribe((v) => (emitida = v));

    const botonKardex = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Kardex'),
    );
    botonKardex?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitida?.id).toBe(1);
  });

  it('oculta el boton "Registrar compra" sin puedeRegistrarCompra', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Registrar compra');
  });

  // OnPush: puedeRegistrarCompra debe estar en su valor final ANTES del
  // primer detectChanges() (mismo motivo que puedeEditar/puedeDesactivar
  // arriba) -- mutarlo despues de que la vista ya se renderizo no dispara
  // un nuevo chequeo del bloque @if que lo usa.
  it('emite registrarCompra con la variante correcta cuando puedeRegistrarCompra es true', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [VariantesListComponent],
      providers: [{ provide: ConfirmDialogService, useValue: { confirm: vi.fn() } }],
    }).compileComponents();

    const otroFixture = TestBed.createComponent(VariantesListComponent);
    otroFixture.componentInstance.variantes = variantes;
    otroFixture.componentInstance.puedeRegistrarCompra = true;
    otroFixture.detectChanges();

    let emitida: ProductoVariante | undefined;
    otroFixture.componentInstance.registrarCompra.subscribe((v) => (emitida = v));

    const botonCompra = Array.from((otroFixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Registrar compra'),
    );
    botonCompra?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitida?.id).toBe(1);
  });
});
