import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { TransformacionService } from '../../transformacion.service';
import { TransformacionProducto } from '../../transformacion.types';
import { TransformacionFormComponent } from './transformacion-form.component';

describe('TransformacionFormComponent', () => {
  let fixture: ComponentFixture<TransformacionFormComponent>;
  let transformacionService: { crear: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

  const transformacionCreada: TransformacionProducto = {
    id: 5,
    variante_origen_id: 8,
    variante_destino_id: 9,
    cantidad_origen: '10.00',
    cantidad_destino: '8.00',
    notas: null,
  };

  async function crearComponente(): Promise<void> {
    transformacionService = { crear: vi.fn() };
    toast = { success: vi.fn(), error: vi.fn(), warn: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TransformacionFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: TransformacionService, useValue: transformacionService },
        { provide: ToastService, useValue: toast },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransformacionFormComponent);
    fixture.detectChanges();
  }

  it('crear() sin variantes ni cantidades no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.crear();

    expect(transformacionService.crear).not.toHaveBeenCalled();
    expect(toast.warn).toHaveBeenCalled();
  });

  it('crear() manda el payload completo, reinicia el formulario y muestra la confirmacion', async () => {
    await crearComponente();
    transformacionService.crear.mockReturnValue(of(transformacionCreada));

    fixture.componentInstance['varianteOrigenId'].set(8);
    fixture.componentInstance['cantidadOrigen'].set(10);
    fixture.componentInstance['varianteDestinoId'].set(9);
    fixture.componentInstance['cantidadDestino'].set(8);

    fixture.componentInstance.crear();

    expect(transformacionService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ variante_origen_id: 8, variante_destino_id: 9, cantidad_origen: 10, cantidad_destino: 8 }),
    );
    expect(fixture.componentInstance['ultimaCreada']()).toEqual(transformacionCreada);
    expect(fixture.componentInstance['varianteOrigenId']()).toBeNull();
    expect(toast.success).toHaveBeenCalled();
  });
});
