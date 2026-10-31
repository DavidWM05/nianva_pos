import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, DynamicFormComponent, ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList detras de
// RecordTabsComponent (ver el mismo stub en cliente-detalle.component.spec.ts).
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { BUSCADOR_CATEGORIA, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { ReglaPrecioService } from '../../regla-precio.service';
import { ReglaPrecio } from '../../regla-precio.types';
import { ReglaPrecioDetalleComponent } from './regla-precio-detalle.component';

describe('ReglaPrecioDetalleComponent', () => {
  let fixture: ComponentFixture<ReglaPrecioDetalleComponent>;

  const regla: ReglaPrecio = {
    id: 9,
    nombre: 'Descuento verano',
    tipo: 'porcentaje',
    valor: '10',
    cantidad_compra: null,
    cantidad_paga: null,
    precio_bundle: null,
    aplica_a: 'todo',
    categoria: null,
    producto: null,
    variante: null,
    fecha_inicio: null,
    fecha_fin: null,
    activo: true,
  };

  function providers(permisos: { editar: boolean; eliminar: boolean }, reglaService?: unknown) {
    return [
      {
        provide: ReglaPrecioService,
        useValue: reglaService ?? { obtener: vi.fn().mockReturnValue(of({ regla, permisos })) },
      },
      { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: BUSCADOR_CATEGORIA, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } } },
    ];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReglaPrecioDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers({ editar: true, eliminar: true }),
    }).compileComponents();

    fixture = TestBed.createComponent(ReglaPrecioDetalleComponent);
    fixture.detectChanges();
  });

  it('renderiza las 2 pestañas y el nombre de la regla', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Descuento verano');
    expect(texto).toContain('General');
    expect(texto).toContain('Auditoría');
  });

  it('el tab de Auditoría no renderiza nucleo-audit-log-viewer hasta que el bloque @defer se activa', async () => {
    const bloques = await fixture.getDeferBlocks();
    expect(bloques).toHaveLength(1);

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).toBeNull();

    await bloques[0].render(DeferBlockState.Complete);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).not.toBeNull();
  });

  it('sin permiso de editar, muestra el mismo formulario deshabilitado (visualizar), no lo oculta', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ReglaPrecioDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers({ editar: false, eliminar: false }),
    }).compileComponents();

    const otroFixture = TestBed.createComponent(ReglaPrecioDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para editar reglas de precio');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });
});
