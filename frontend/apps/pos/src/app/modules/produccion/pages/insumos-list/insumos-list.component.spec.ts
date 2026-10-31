import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_UNIDAD_MEDIDA } from '../../../../core/buscadores-entidad.tokens';
import { InsumoService, InsumosPagina } from '../../insumo.service';
import { Insumo } from '../../insumo.types';
import { InsumosListComponent } from './insumos-list.component';

describe('InsumosListComponent', () => {
  let fixture: ComponentFixture<InsumosListComponent>;
  let insumoService: { listar: ReturnType<typeof vi.fn>; crear: ReturnType<typeof vi.fn> };

  const insumos: Insumo[] = [
    { id: 1, nombre: 'Harina', sku: 'HAR-1', unidad_medida_id: 5, costo: '10.5000', stock_minimo: '5.00', activo: true },
  ];

  function paginaCon(permisos: InsumosPagina['permisos']): InsumosPagina {
    return { data: insumos, total: insumos.length, permisos };
  }

  async function crearComponente(permisos: InsumosPagina['permisos'] = { crear: true }): Promise<void> {
    insumoService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [InsumosListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: InsumoService, useValue: insumoService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        {
          provide: BUSCADOR_UNIDAD_MEDIDA,
          useValue: { buscar: vi.fn().mockReturnValue(of([{ id: 5, nombre: 'Kilogramo' }])), obtener: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InsumosListComponent);
    fixture.detectChanges();
  }

  it('carga los insumos al iniciar y resuelve el nombre de la unidad de medida', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Harina');
    expect(texto).toContain('Kilogramo');
    expect(insumoService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nuevo insumo" sin el permiso produccion.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo insumo');
  });

  it('activar "solo stock bajo" vuelve a pedir la lista con stock_bajo=true', async () => {
    await crearComponente();

    fixture.componentInstance.onStockBajoCambio(true);

    expect(insumoService.listar).toHaveBeenCalledTimes(2);
    expect(insumoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), { nombre: '', stockBajo: true });
  });

  it('guardar() sin unidad de medida seleccionada no llama al backend', async () => {
    await crearComponente();
    fixture.componentInstance['nombre'].set('Azúcar');

    fixture.componentInstance.guardar();

    expect(insumoService.crear).not.toHaveBeenCalled();
  });

  it('guardar() manda el payload correcto', async () => {
    await crearComponente();
    insumoService.crear.mockReturnValue(of(insumos[0]));

    fixture.componentInstance['nombre'].set('Azúcar');
    fixture.componentInstance['unidadMedidaId'].set(5);
    fixture.componentInstance.guardar();

    expect(insumoService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Azúcar', unidad_medida_id: 5 }),
    );
  });
});
