import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ClienteService } from '../crm/cliente.service';
import { ClientesListComponent } from '../crm/pages/clientes-list/clientes-list.component';
import { CuponService } from './cupon.service';
import { CuponesListComponent } from './pages/cupones-list/cupones-list.component';
import { ReglasPrecioListComponent } from './pages/reglas-precio-list/reglas-precio-list.component';
import { ReglaPrecioService } from './regla-precio.service';

const casos = [
  {
    nombre: 'clientes',
    componente: ClientesListComponent,
    servicio: ClienteService,
    fila: { id: 1, nombre: 'Cliente', activo: true, es_sistema: false },
  },
  {
    nombre: 'cupones',
    componente: CuponesListComponent,
    servicio: CuponService,
    fila: {
      id: 1,
      codigo: 'CUPON',
      nombre: 'Cupón',
      tipo: 'porcentaje',
      valor: '10.00',
      activo: true,
    },
  },
  {
    nombre: 'reglas',
    componente: ReglasPrecioListComponent,
    servicio: ReglaPrecioService,
    fila: {
      id: 1,
      nombre: 'Regla',
      tipo: 'porcentaje',
      aplica_a: 'todo',
      activo: true,
    },
  },
];

for (const caso of casos) {
  describe('50e: ' + caso.nombre, () => {
    async function montar(
      permisos = { crear: true, editar: true, eliminar: true },
    ): Promise<ComponentFixture<object>> {
      await TestBed.configureTestingModule({
        imports: [caso.componente],
        providers: [
          ...proveedoresDePantalla(),
          {
            provide: caso.servicio,
            useValue: {
              listar: vi
                .fn()
                .mockReturnValue(
                  of({ data: [caso.fila], total: 100, permisos }),
                ),
            },
          },
          { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
          {
            provide: ToastService,
            useValue: { success: vi.fn(), error: vi.fn() },
          },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(caso.componente as Type<object>);
      fixture.detectChanges();
      return fixture;
    }

    it('meta refleja la página pedida aunque el total no cambie', async () => {
      const fixture = await montar();
      const instancia = fixture.componentInstance;
      expect(Reflect.get(instancia, 'meta')().page).toBe(1);
      Reflect.get(instancia, 'onLazyLoad').call(instancia, {
        first: 25,
        rows: 25,
        sortField: null,
        sortOrder: null,
        filters: {},
      });
      fixture.detectChanges();
      expect(Reflect.get(instancia, 'meta')().page).toBe(2);
      expect(Reflect.get(instancia, 'meta')().total).toBe(100);
    });

    for (const permiso of ['crear', 'editar', 'eliminar'] as const) {
      it('sin permiso ' + permiso + ' oculta su acción', async () => {
        const fixture = await montar({
          crear: true,
          editar: true,
          eliminar: true,
          [permiso]: false,
        });
        const elemento: HTMLElement = fixture.nativeElement;
        if (permiso === 'crear') {
          expect(
            elemento.querySelector('a[href$="/nuevo"], ui-btn-crear'),
          ).toBeNull();
        } else {
          expect(
            elemento.querySelector(
              '[aria-label="' +
                (permiso === 'editar' ? 'Editar' : 'Desactivar') +
                '"]',
            ),
          ).toBeNull();
        }
      });
    }
  });
}
