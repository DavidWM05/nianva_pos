import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PrestamoService, PrestamosPagina } from '../../prestamo.service';
import { Prestamo } from '../../prestamo.types';
import { PrestamosListComponent } from './prestamos-list.component';

describe('PrestamosListComponent', () => {
  let fixture: ComponentFixture<PrestamosListComponent>;
  let prestamoService: { listar: ReturnType<typeof vi.fn> };

  function prestamoCon(overrides: Partial<Prestamo>): Prestamo {
    return {
      id: 1,
      proveedor_id: null,
      referencia: 'Juan Pérez',
      monto: '1000.00',
      interes: '5.00',
      monto_a_pagar: '1050.00',
      saldo_pendiente: '1050.00',
      fecha_prestamo: '2026-07-01',
      fecha_vencimiento: null,
      estado: 'activo',
      notas: null,
      pagos: [],
      ...overrides,
    };
  }

  function paginaCon(data: Prestamo[]): PrestamosPagina {
    return { data, total: data.length };
  }

  async function crearComponente(prestamos: Prestamo[] = [prestamoCon({})]): Promise<void> {
    prestamoService = { listar: vi.fn().mockReturnValue(of(paginaCon(prestamos))) };

    await TestBed.configureTestingModule({
      imports: [PrestamosListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PrestamoService, useValue: prestamoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrestamosListComponent);
    fixture.detectChanges();
  }

  it('carga los préstamos al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(prestamoService.listar).toHaveBeenCalledTimes(1);
  });

  it('"Ver" navega al detalle del préstamo', async () => {
    const prestamo = prestamoCon({ id: 5 });
    await crearComponente([prestamo]);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(prestamo);

    expect(navigateSpy).toHaveBeenCalledWith(['/prestamos', 5]);
  });
});
