import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { expect, it, vi } from 'vitest';
import { ToastService } from '@nianva/ui-shared';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { OrdenesListComponent } from './pages/ordenes-list/ordenes-list.component';
import { OrdenProduccionService } from './orden.service';

it('50l órdenes: las acciones de estado exigen produccion.completar', async () => {
  const orden = {
    id: 1,
    cantidad_programada: 2,
    cantidad_producida: null,
    estado: 'pendiente',
    notas: null,
    fecha_programada: null,
    fecha_completada: null,
    receta: { id: 1, nombre: 'Receta' },
  };
  const listar = vi
    .fn()
    .mockReturnValue(
      of({
        data: [orden],
        total: 1,
        permisos: { crear: true, completar: false },
      }),
    );
  await TestBed.configureTestingModule({
    imports: [OrdenesListComponent],
    providers: [
      ...proveedoresDePantalla(),
      { provide: OrdenProduccionService, useValue: { listar } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();
  const f = TestBed.createComponent(OrdenesListComponent);
  f.detectChanges();
  const host = f.nativeElement as HTMLElement;
  expect(host.querySelector('button[aria-label="Iniciar"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Completar"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Cancelar"]')).toBeNull();
  listar.mockReturnValue(
    of({ data: [orden], total: 1, permisos: { crear: true, completar: true } }),
  );
  f.componentInstance.reintentar();
  f.detectChanges();
  expect(host.querySelector('button[aria-label="Iniciar"]')).not.toBeNull();
  expect(host.querySelector('button[aria-label="Completar"]')).not.toBeNull();
  expect(host.querySelector('button[aria-label="Cancelar"]')).not.toBeNull();
});
