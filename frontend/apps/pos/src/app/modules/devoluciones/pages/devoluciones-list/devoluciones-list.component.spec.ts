import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { Devolucion, DevolucionesPagina, DevolucionesPermisos } from '../../devolucion.types';
import { DevolucionService } from '../../devolucion.service';
import { DevolucionesListComponent } from './devoluciones-list.component';

describe('DevolucionesListComponent', () => {
  let fixture: ComponentFixture<DevolucionesListComponent>;
  let devolucionService: { listar: ReturnType<typeof vi.fn> };

  const devoluciones: Devolucion[] = [
    {
      id: 1,
      fecha: '2026-07-20T10:00:00.000000Z',
      tipo: 'devolucion',
      venta: { id: 55, cliente_nombre: 'Publico General' },
      venta_sombra_id: null,
      monto_devolucion: '120.00',
      monto_cambio: '0.00',
      diferencia: '-120.00',
      motivo: 'Talla incorrecta',
      tipo_reembolso: 'efectivo',
      nota_credito_id: null,
    },
    {
      id: 2,
      fecha: '2026-07-21T10:00:00.000000Z',
      tipo: 'cambio',
      venta: { id: 56, cliente_nombre: 'Maria Lopez' },
      venta_sombra_id: 99,
      monto_devolucion: '120.00',
      monto_cambio: '400.00',
      diferencia: '280.00',
      motivo: null,
      tipo_reembolso: null,
      nota_credito_id: null,
    },
  ];

  function paginaCon(permisos: DevolucionesPermisos): DevolucionesPagina {
    return { data: devoluciones, total: devoluciones.length, permisos };
  }

  async function crearComponente(permisos: DevolucionesPermisos): Promise<void> {
    devolucionService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [DevolucionesListComponent],
      providers: [
        ...proveedoresDePantalla(),
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: DevolucionService, useValue: devolucionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DevolucionesListComponent);
    fixture.detectChanges();
  }

  it('muestra el reembolso en negativo y el cobro adicional en positivo', async () => {
    await crearComponente({ crear: true });

    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(filas).toHaveLength(2);
    expect(filas[0].querySelector('.ui-tabla__numero')?.textContent?.trim()).toBe('-$120.00');
    expect(filas[0].textContent).toContain('Reembolso');
    expect(filas[1].querySelector('.ui-tabla__numero')?.textContent?.trim()).toBe('$280.00');
    expect(filas[1].textContent).toContain('Cobro');
  });

  it('colorea el reembolso distinto del cobro adicional', async () => {
    await crearComponente({ crear: true });

    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(filas).toHaveLength(2);
    const negativo = filas[0].querySelector('.ui-tabla__numero');
    const positivo = filas[1].querySelector('.ui-tabla__numero');
    expect(negativo).not.toBeNull();
    expect(positivo).not.toBeNull();
    expect(negativo?.classList.contains('ui-tabla__numero--peligro')).toBe(true);
    expect(positivo?.classList.contains('ui-tabla__numero--peligro')).toBe(false);
  });

  it('oculta "Nueva devolución / cambio" sin el permiso devoluciones.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nueva devolución');
  });
});
