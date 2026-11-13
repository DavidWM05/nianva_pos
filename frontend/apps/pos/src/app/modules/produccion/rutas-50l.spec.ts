import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { afterEach, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import {
  BUSCADOR_UNIDAD_MEDIDA,
  BUSCADOR_RECETA,
} from '../../core/buscadores-entidad.tokens';
import { InsumosListComponent } from './pages/insumos-list/insumos-list.component';
import { OrdenesListComponent } from './pages/ordenes-list/ordenes-list.component';
import { InsumoService } from './insumo.service';
import { OrdenProduccionService } from './orden.service';

afterEach(() => TestBed.resetTestingModule());
for (const [nombre, componente, servicio] of [
  ['insumos', InsumosListComponent, InsumoService],
  ['ordenes', OrdenesListComponent, OrdenProduccionService],
] as const) {
  it(
    '50l ' + nombre + ': abre el alta dedicada y permite regresar por URL',
    async () => {
      await TestBed.configureTestingModule({
        imports: [componente],
        providers: [
          ...proveedoresDePantalla(),
          provideRouter([
            { path: 'produccion/' + nombre + '/nuevo', children: [] },
          ]),
          {
            provide: servicio,
            useValue: {
              listar: () =>
                of({ data: [], total: 0, permisos: { crear: true } }),
            },
          },
          {
            provide: ToastService,
            useValue: { success: vi.fn(), error: vi.fn() },
          },
          {
            provide: BUSCADOR_UNIDAD_MEDIDA,
            useValue: { buscar: () => of([]) },
          },
          { provide: BUSCADOR_RECETA, useValue: { buscar: () => of([]) } },
        ],
      }).compileComponents();
      const f = TestBed.createComponent<object>(componente);
      f.detectChanges();
      const button = (
        f.nativeElement as HTMLElement
      ).querySelector<HTMLButtonElement>('button');
      expect(button).not.toBeNull();
      button?.click();
      await f.whenStable();
      expect(TestBed.inject(Router).url).toBe(
        '/produccion/' + nombre + '/nuevo',
      );
    },
  );
}
