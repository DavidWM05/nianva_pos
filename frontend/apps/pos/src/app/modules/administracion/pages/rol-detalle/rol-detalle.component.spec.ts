import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, DynamicFormComponent, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
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

import { PermisoService } from '../../permiso.service';
import { RolService } from '../../rol.service';
import { Rol } from '../../rol.types';
import { RolDetalleComponent } from './rol-detalle.component';

describe('RolDetalleComponent', () => {
  let fixture: ComponentFixture<RolDetalleComponent>;

  const rol: Rol = { id: 7, nombre: 'Cajero', descripcion: null, es_sistema: false, permisos: [1, 2] };

  function providers(rolDevuelto: Rol, permisos: { editar: boolean; eliminar: boolean }) {
    return [
      provideAnimationsAsync(),
      providePrimeNG(),
      { provide: RolService, useValue: { obtener: vi.fn().mockReturnValue(of({ rol: rolDevuelto, permisos })) } },
      { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      { provide: PermisoService, useValue: { agrupadosPorModulo: vi.fn().mockReturnValue(of([])) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
    ];
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers(rol, { editar: true, eliminar: true }),
    }).compileComponents();

    fixture = TestBed.createComponent(RolDetalleComponent);
    fixture.detectChanges();
  });

  it('renderiza las 2 pestañas y el nombre del rol', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Cajero');
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

  it('siendo de sistema, muestra el mismo formulario deshabilitado aunque el usuario tenga permiso de editar', async () => {
    const rolSistema: Rol = { ...rol, id: 1, nombre: 'admin', es_sistema: true };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RolDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers(rolSistema, { editar: true, eliminar: true }),
    }).compileComponents();

    const otroFixture = TestBed.createComponent(RolDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('rol de sistema');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });

  it('sin permiso de editar (y no de sistema), muestra el mismo formulario deshabilitado, no lo oculta', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RolDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers(rol, { editar: false, eliminar: false }),
    }).compileComponents();

    const otroFixture = TestBed.createComponent(RolDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para editar roles');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });
});
