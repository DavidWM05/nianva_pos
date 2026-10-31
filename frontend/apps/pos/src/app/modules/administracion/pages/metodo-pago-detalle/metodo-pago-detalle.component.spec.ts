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

import { MetodoPagoAdminService } from '../../metodo-pago-admin.service';
import { MetodoPagoAdmin } from '../../metodo-pago.types';
import { MetodoPagoDetalleComponent } from './metodo-pago-detalle.component';

describe('MetodoPagoDetalleComponent', () => {
  let fixture: ComponentFixture<MetodoPagoDetalleComponent>;

  const metodoPago: MetodoPagoAdmin = {
    id: 1,
    nombre: 'Efectivo',
    tipo: 'efectivo',
    incluir_en_financiero: true,
    activo: true,
    es_global: true,
  };

  function providers(metodoPagoDevuelto: MetodoPagoAdmin, permisos: { editar: boolean; eliminar: boolean }) {
    return [
      {
        provide: MetodoPagoAdminService,
        useValue: { obtener: vi.fn().mockReturnValue(of({ metodoPago: metodoPagoDevuelto, permisos })) },
      },
      { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
    ];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetodoPagoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers(metodoPago, { editar: true, eliminar: true }),
    }).compileComponents();

    fixture = TestBed.createComponent(MetodoPagoDetalleComponent);
    fixture.detectChanges();
  });

  it('renderiza las 2 pestañas y el nombre del metodo de pago', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Efectivo');
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

  it('siendo global, muestra el mismo formulario deshabilitado aunque el usuario tenga permiso de editar', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('catálogo global');

    const formulario = fixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });

  it('sin permiso de editar (y no global), muestra el mismo formulario deshabilitado, no lo oculta', async () => {
    const propio: MetodoPagoAdmin = { ...metodoPago, id: 2, nombre: 'Vales', es_global: false };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MetodoPagoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers(propio, { editar: false, eliminar: false }),
    }).compileComponents();

    const otroFixture = TestBed.createComponent(MetodoPagoDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para editar métodos de pago');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });
});
