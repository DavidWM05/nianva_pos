import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TransformacionService, TransformacionesPagina } from '../../transformacion.service';
import { TransformacionProducto } from '../../transformacion.types';
import { TransformacionesListComponent } from './transformaciones-list.component';

describe('TransformacionesListComponent', () => {
  let fixture: ComponentFixture<TransformacionesListComponent>;
  let transformacionService: { listar: ReturnType<typeof vi.fn> };

  const transformaciones: TransformacionProducto[] = [
    { id: 1, variante_origen_id: 8, variante_destino_id: 9, cantidad_origen: '10.00', cantidad_destino: '8.00', notas: null },
  ];

  function paginaCon(permisos: TransformacionesPagina['permisos']): TransformacionesPagina {
    return { data: transformaciones, total: transformaciones.length, permisos };
  }

  async function crearComponente(permisos: TransformacionesPagina['permisos'] = { crear: true }): Promise<void> {
    transformacionService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [TransformacionesListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: TransformacionService, useValue: transformacionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransformacionesListComponent);
    fixture.detectChanges();
  }

  it('carga las transformaciones al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Variante #8');
    expect(texto).toContain('Variante #9');
    expect(transformacionService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nueva transformación" sin el permiso produccion.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nueva transformación');
  });
});
