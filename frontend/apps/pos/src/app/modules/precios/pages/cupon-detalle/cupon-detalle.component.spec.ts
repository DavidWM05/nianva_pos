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

import { CuponService } from '../../cupon.service';
import { Cupon } from '../../cupon.types';
import { CuponDetalleComponent } from './cupon-detalle.component';

describe('CuponDetalleComponent', () => {
  let fixture: ComponentFixture<CuponDetalleComponent>;

  const cupon: Cupon = {
    id: 4,
    codigo: 'VERANO10',
    nombre: 'Verano',
    tipo: 'porcentaje',
    valor: '10',
    uso_maximo: null,
    uso_maximo_por_cliente: null,
    fecha_inicio: null,
    fecha_fin: null,
    activo: true,
  };

  function providers(permisos: { editar: boolean; eliminar: boolean }) {
    return [
      { provide: CuponService, useValue: { obtener: vi.fn().mockReturnValue(of({ cupon, permisos })) } },
      { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '4' }) } } },
    ];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuponDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers({ editar: true, eliminar: true }),
    }).compileComponents();

    fixture = TestBed.createComponent(CuponDetalleComponent);
    fixture.detectChanges();
  });

  it('renderiza las 2 pestañas y el codigo del cupon', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('VERANO10');
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
      imports: [CuponDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers({ editar: false, eliminar: false }),
    }).compileComponents();

    const otroFixture = TestBed.createComponent(CuponDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para editar cupones');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });
});
