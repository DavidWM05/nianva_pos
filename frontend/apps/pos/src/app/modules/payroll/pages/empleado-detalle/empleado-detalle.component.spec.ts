import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList (detras de
// RecordTabsComponent) en ngAfterViewInit. Mismo stub que
// cotizacion-detalle.component.spec.ts.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { EmpleadoService } from '../../empleado.service';
import { Empleado } from '../../empleado.types';
import { EmpleadoDetalleComponent } from './empleado-detalle.component';

describe('EmpleadoDetalleComponent', () => {
  let fixture: ComponentFixture<EmpleadoDetalleComponent>;
  let empleadoService: { obtener: ReturnType<typeof vi.fn> };

  function empleadoCon(overrides: Partial<Empleado>): Empleado {
    return {
      id: 5,
      usuario_id: 4,
      usuario: { id: 4, nombre: 'Carlos' },
      sucursal_id: 7,
      salario_base: '8000.00',
      tipo_salario: 'fijo',
      numero_seguridad_social: '123-45-6789',
      fecha_ingreso: '2026-01-01',
      activo: true,
      ...overrides,
    };
  }

  async function crearComponente(empleado: Empleado): Promise<void> {
    empleadoService = { obtener: vi.fn().mockReturnValue(of(empleado)) };

    await TestBed.configureTestingModule({
      imports: [EmpleadoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: EmpleadoService, useValue: empleadoService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpleadoDetalleComponent);
    fixture.detectChanges();
  }

  it('carga el empleado por id de la ruta y muestra el nombre del usuario', async () => {
    await crearComponente(empleadoCon({}));

    expect(empleadoService.obtener).toHaveBeenCalledWith(5);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Carlos');
    expect(texto).toContain('8000.00');
    expect(texto).toContain('123-45-6789');
  });

  it('sin nombre de usuario (backend no lo cargo), cae a "Usuario #id"', async () => {
    await crearComponente(empleadoCon({ usuario: null }));

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Usuario #4');
  });
});
