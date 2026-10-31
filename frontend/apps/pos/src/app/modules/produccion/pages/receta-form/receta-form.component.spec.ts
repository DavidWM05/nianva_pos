import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_INSUMO, BUSCADOR_PRODUCTO, BUSCADOR_UNIDAD_MEDIDA, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { RecetaService } from '../../receta.service';
import { Receta } from '../../receta.types';
import { RecetaFormComponent } from './receta-form.component';

describe('RecetaFormComponent', () => {
  let fixture: ComponentFixture<RecetaFormComponent>;
  let recetaService: { crear: ReturnType<typeof vi.fn> };
  let router: Router;

  const recetaCreada: Receta = {
    id: 10,
    variante_id: 8,
    nombre: 'Pan de caja',
    descripcion: null,
    instrucciones: null,
    rendimiento: '10.00',
  };

  async function crearComponente(): Promise<void> {
    recetaService = { crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RecetaFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: RecetaService, useValue: recetaService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        {
          provide: BUSCADOR_INSUMO,
          useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 3, nombre: 'Harina' })) },
        },
        {
          provide: BUSCADOR_UNIDAD_MEDIDA,
          useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 5, nombre: 'Kilogramo' })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecetaFormComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('agregarIngrediente() resuelve los nombres via obtener() y los agrega a la lista', async () => {
    await crearComponente();

    fixture.componentInstance['insumoStagingId'].set(3);
    fixture.componentInstance['unidadMedidaStagingId'].set(5);
    fixture.componentInstance['cantidadStaging'].set(2.5);
    fixture.componentInstance.agregarIngrediente();

    expect(fixture.componentInstance['ingredientes']()).toEqual([
      { insumo_id: 3, cantidad: 2.5, unidad_medida_id: 5, etiquetaInsumo: 'Harina', etiquetaUnidad: 'Kilogramo' },
    ]);
    // La captura se reinicia para el siguiente ingrediente.
    expect(fixture.componentInstance['insumoStagingId']()).toBeNull();
  });

  it('sin variante, nombre o ingredientes, crear() no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.crear();

    expect(recetaService.crear).not.toHaveBeenCalled();
  });

  it('crear() manda el payload completo y navega a la lista', async () => {
    await crearComponente();
    recetaService.crear.mockReturnValue(of(recetaCreada));

    fixture.componentInstance.onVarianteSeleccionada(8);
    fixture.componentInstance['nombre'].set('Pan de caja');
    fixture.componentInstance['insumoStagingId'].set(3);
    fixture.componentInstance['unidadMedidaStagingId'].set(5);
    fixture.componentInstance['cantidadStaging'].set(2.5);
    fixture.componentInstance.agregarIngrediente();

    fixture.componentInstance.crear();

    expect(recetaService.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        variante_id: 8,
        nombre: 'Pan de caja',
        ingredientes: [{ insumo_id: 3, cantidad: 2.5, unidad_medida_id: 5 }],
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/produccion/recetas']);
  });
});
