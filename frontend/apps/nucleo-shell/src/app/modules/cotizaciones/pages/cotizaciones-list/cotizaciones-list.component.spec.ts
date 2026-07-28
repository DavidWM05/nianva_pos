import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CotizacionesPagina, CotizacionService } from '../../cotizacion.service';
import { Cotizacion } from '../../cotizacion.types';
import { CotizacionesListComponent } from './cotizaciones-list.component';

describe('CotizacionesListComponent', () => {
  let fixture: ComponentFixture<CotizacionesListComponent>;
  let cotizacionService: { listar: ReturnType<typeof vi.fn> };

  const cotizaciones: Cotizacion[] = [
    {
      id: 1,
      numero_cotizacion: 'COT-000001',
      cliente: { id: 9, nombre: 'Juan Pérez' },
      total: '500.00',
      descuento: '0.00',
      estado: 'pendiente',
      validez_dias: 15,
      fecha_vencimiento: '2026-08-15',
      observaciones: null,
      uso_cfdi: null,
      venta_id: null,
      created_at: '2026-07-27T10:00:00Z',
      updated_at: '2026-07-27T10:00:00Z',
    },
  ];

  function paginaCon(permisos: CotizacionesPagina['permisos']): CotizacionesPagina {
    return { data: cotizaciones, total: cotizaciones.length, permisos };
  }

  async function crearComponente(permisos: CotizacionesPagina['permisos']): Promise<void> {
    cotizacionService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [CotizacionesListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CotizacionService, useValue: cotizacionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CotizacionesListComponent);
    fixture.detectChanges();
  }

  it('carga las cotizaciones al iniciar', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('COT-000001');
    expect(cotizacionService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nueva cotización" sin el permiso cotizaciones.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nueva cotización');
  });

  it('cambiar el filtro de estado vuelve a pedir la lista con filtro_estado', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    fixture.componentInstance.onEstadoCambio('pendiente');

    expect(cotizacionService.listar).toHaveBeenCalledTimes(2);
    expect(cotizacionService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), { numero: '', estado: 'pendiente' });
  });

  it('"Ver" navega al detalle de la cotización', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(cotizaciones[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/cotizaciones', 1]);
  });
});
