import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, expect, it } from 'vitest';
import { TablaComponent } from './tabla.component';
import { ColumnaListado } from './listado.types';

interface FilaDecimal { id: number; nombre: string; precio: string | number; cantidad: string | number; }

describe('columnas decimales de API-02', () => {
  it.each([['1250.50', '0.500'], [1250.5, 0.5]])('formatea dinero %s y cantidad %s', async (precio, cantidad) => {
    await TestBed.configureTestingModule({ imports: [TablaComponent], providers: [provideAnimationsAsync()] }).compileComponents();
    const fixture = TestBed.createComponent(TablaComponent<FilaDecimal>);
    const columnas: ColumnaListado<FilaDecimal>[] = [
      { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre' },
      { tipo: 'dinero', campo: 'precio', encabezado: 'Precio' },
      { tipo: 'cantidad', campo: 'cantidad', encabezado: 'Cantidad', unidad: 'kg' },
    ];
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('filas', [{ id: 1, nombre: 'Granel', precio, cantidad }]);
    fixture.componentRef.setInput('meta', { total: 1, page: 1, rows: 25, filtros_aplicados: {}, permisos: {} });
    fixture.componentRef.setInput('cargando', false);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('$1,250.50');
    expect(root.textContent).toContain('0.5 kg');
  });
});
