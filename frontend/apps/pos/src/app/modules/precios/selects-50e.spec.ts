import { Type, getDebugNode } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { SelectFiltroComponent } from '@nianva/ui-forms';
import { AuditLogSource } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { expect, it, vi } from 'vitest';

import {
  BUSCADOR_CATEGORIA,
  BUSCADOR_PRODUCTO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
} from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ClienteService } from '../crm/cliente.service';
import { CrmAvanzadoService } from '../crm/crm-avanzado.service';
import { CampanaService } from '../crm/campana.service';
import { CampanaFormComponent } from '../crm/pages/campana-form/campana-form.component';
import { ClienteDetalleComponent } from '../crm/pages/cliente-detalle/cliente-detalle.component';
import { ReglaPrecioFormComponent } from './regla-precio-form/regla-precio-form.component';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
);
const casos: { nombre: string; componente: Type<object>; abrir?: string }[] = [
  { nombre: 'Aplica a', componente: ReglaPrecioFormComponent },
  { nombre: 'Segmento de clientes', componente: CampanaFormComponent },
  {
    nombre: 'Tipo de interacción',
    componente: ClienteDetalleComponent,
    abrir: 'abrirNuevaInteraccion',
  },
];
for (const caso of casos) {
  it(caso.nombre + ' usa el select obligatorio sin opción Todas', async () => {
    const buscador = {
      buscar: vi.fn().mockReturnValue(of([])),
      obtener: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [caso.componente],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        ...proveedoresDePantalla(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
        },
        { provide: BUSCADOR_CATEGORIA, useValue: buscador },
        { provide: BUSCADOR_PRODUCTO, useValue: buscador },
        {
          provide: BUSCADOR_VARIANTE_DE_PRODUCTO,
          useValue: { hijosDe: vi.fn().mockReturnValue(of([])) },
        },
        {
          provide: AuditLogSource,
          useValue: { listar: vi.fn().mockReturnValue(of([])) },
        },
        { provide: CampanaService, useValue: {} },
        {
          provide: ClienteService,
          useValue: {
            obtener: vi
              .fn()
              .mockReturnValue(
                of({
                  cliente: { id: 7, nombre: 'Cliente', es_sistema: false },
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
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(caso.componente);
    fixture.detectChanges();
    if (caso.abrir) {
      Reflect.get(fixture.componentInstance, caso.abrir).call(
        fixture.componentInstance,
      );
      fixture.detectChanges();
    }
    await fixture.whenStable();
    const elemento = caso.abrir
      ? document.querySelector('[role="dialog"] ui-select-filtro')
      : fixture.nativeElement.querySelector('ui-select-filtro');
    expect(elemento).not.toBeNull();
    if (!elemento) throw new Error('Falta el select obligatorio');
    const selector: SelectFiltroComponent =
      getDebugNode(elemento)?.componentInstance;
    expect(selector.todas()).toBe(false);
    expect(elemento.closest('ui-campo')).not.toBeNull();
  });
}

it('asocia los campos nativos de campaña con sus etiquetas', async () => {
  await TestBed.configureTestingModule({
    imports: [CampanaFormComponent],
    providers: [
      ...proveedoresDePantalla(),
      { provide: CampanaService, useValue: {} },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CampanaFormComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  const elemento: HTMLElement = fixture.nativeElement;
  for (const etiqueta of ['Asunto', 'Mensaje']) {
    const label = Array.from(elemento.querySelectorAll('label')).find((label) =>
      label.textContent?.includes(etiqueta),
    );
    expect(label).toBeDefined();
    expect(label?.control).not.toBeNull();
  }
});
