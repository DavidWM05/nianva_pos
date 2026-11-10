import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, RecordTabsComponent } from '@nianva/ui-shared';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { expect, it, vi } from 'vitest';

import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ClienteService } from '../crm/cliente.service';
import { CrmAvanzadoService } from '../crm/crm-avanzado.service';
import { ClienteDetalleComponent } from '../crm/pages/cliente-detalle/cliente-detalle.component';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
);
for (const area of ['Ventas', 'Puntos'] as const) {
  it(
    'historial de ' +
      area +
      ': meta y filas cambian de página con el mismo total',
    async () => {
      const ventas = Array.from({ length: 40 }, (_, i) => ({
        id: i + 1,
        fecha: '2026-11-09',
        total: '20.00',
        estado: 'completada',
        es_venta_sombra: false,
      }));
      const historial = Array.from({ length: 40 }, (_, i) => ({
        id: i + 1,
        tipo: 'ajuste',
        puntos: 1,
        created_at: '2026-11-09',
        referencia_tabla: null,
      }));
      await TestBed.configureTestingModule({
        imports: [ClienteDetalleComponent],
        deferBlockBehavior: DeferBlockBehavior.Manual,
        providers: [
          ...proveedoresDePantalla(),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { paramMap: convertToParamMap({ id: '7' }) },
            },
          },
          {
            provide: ClienteService,
            useValue: {
              obtener: vi.fn().mockReturnValue(
                of({
                  cliente: { id: 7, nombre: 'Cliente' },
                  permisos: { editar: false },
                }),
              ),
              ventas: vi.fn().mockReturnValue(of(ventas)),
            },
          },
          {
            provide: CrmAvanzadoService,
            useValue: {
              interacciones: vi.fn().mockReturnValue(of([])),
              loyalty: vi
                .fn()
                .mockReturnValue(
                  of({ puntos_loyalty: 40, puntos_acumulados: 40, historial }),
                ),
            },
          },
          {
            provide: AuditLogSource,
            useValue: { listar: vi.fn().mockReturnValue(of([])) },
          },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(ClienteDetalleComponent);
      fixture.detectChanges();
      const instancia = fixture.componentInstance;
      const meta = Reflect.get(instancia, 'meta' + area);
      const filas = Reflect.get(instancia, 'filas' + area);
      expect(meta().page).toBe(1);
      expect(meta().total).toBe(40);
      Reflect.get(instancia, 'pagina' + area).set({
        page: 2,
        rows: 25,
        sortField: null,
        sortOrder: null,
      });
      fixture.detectChanges();
      expect(meta().page).toBe(2);
      expect(meta().total).toBe(40);
      expect(filas()).toHaveLength(15);
      expect(filas()[0].id).toBe(26);
    },
  );
}

it('conserva exactamente las cinco plantillas de tabs del cliente', async () => {
  await TestBed.configureTestingModule({
    imports: [ClienteDetalleComponent],
    deferBlockBehavior: DeferBlockBehavior.Manual,
    providers: [
      ...proveedoresDePantalla(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
      },
      {
        provide: ClienteService,
        useValue: {
          obtener: vi
            .fn()
            .mockReturnValue(
              of({
                cliente: { id: 7, nombre: 'Cliente' },
                permisos: { editar: true },
              }),
            ),
          ventas: vi.fn().mockReturnValue(of([])),
        },
      },
      {
        provide: CrmAvanzadoService,
        useValue: {
          interacciones: vi.fn().mockReturnValue(of([])),
          loyalty: vi
            .fn()
            .mockReturnValue(
              of({ puntos_loyalty: 0, puntos_acumulados: 0, historial: [] }),
            ),
        },
      },
      {
        provide: AuditLogSource,
        useValue: { listar: vi.fn().mockReturnValue(of([])) },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ClienteDetalleComponent);
  fixture.detectChanges();
  const tabs: RecordTabsComponent = fixture.debugElement.query(
    By.directive(RecordTabsComponent),
  ).componentInstance;
  expect(tabs.templates.length).toBe(5);
});
