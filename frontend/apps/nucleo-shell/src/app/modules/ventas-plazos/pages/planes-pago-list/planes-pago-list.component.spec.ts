import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PlanPagoService, PlanesPagoPagina } from '../../plan-pago.service';
import { PlanPago } from '../../plan-pago.types';
import { PlanesPagoListComponent } from './planes-pago-list.component';

describe('PlanesPagoListComponent', () => {
  let fixture: ComponentFixture<PlanesPagoListComponent>;
  let planPagoService: { listar: ReturnType<typeof vi.fn> };

  const planes: PlanPago[] = [
    {
      id: 1,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      venta_id: 3,
      concepto: 'Venta #3 - Pago a plazos',
      monto_total: '550.00',
      interes_total: '50.00',
      tasa_interes: '10.00',
      numero_cuotas: 6,
      periodicidad: 'mensual',
      fecha_inicio: '2026-07-27',
      created_at: '2026-07-27T10:00:00Z',
    },
  ];

  function paginaCon(permisos: PlanesPagoPagina['permisos']): PlanesPagoPagina {
    return { data: planes, total: planes.length, permisos };
  }

  async function crearComponente(permisos: PlanesPagoPagina['permisos'] = { crear: true }): Promise<void> {
    planPagoService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [PlanesPagoListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PlanPagoService, useValue: planPagoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanesPagoListComponent);
    fixture.detectChanges();
  }

  it('carga los planes de pago al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(planPagoService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nuevo plan de pago" sin el permiso ventas_plazos.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo plan de pago');
  });
});
