import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PrestamoService } from '../../prestamo.service';
import { Prestamo } from '../../prestamo.types';
import { PrestamoFormComponent } from './prestamo-form.component';

describe('PrestamoFormComponent', () => {
  let fixture: ComponentFixture<PrestamoFormComponent>;
  let prestamoService: { crear: ReturnType<typeof vi.fn> };
  let router: Router;

  const prestamoCreado: Prestamo = {
    id: 10,
    proveedor_id: null,
    referencia: 'Ana López',
    monto: '500.00',
    interes: '0.00',
    monto_a_pagar: '500.00',
    saldo_pendiente: '500.00',
    fecha_prestamo: '2026-07-27',
    fecha_vencimiento: null,
    estado: 'activo',
    notas: null,
  };

  async function crearComponente(): Promise<void> {
    prestamoService = { crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PrestamoFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PrestamoService, useValue: prestamoService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrestamoFormComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('crear() manda interes 0 por defecto y navega a la lista al terminar', async () => {
    await crearComponente();
    prestamoService.crear.mockReturnValue(of(prestamoCreado));

    fixture.componentInstance['monto'].set(500);
    fixture.componentInstance['fechaPrestamo'].set(new Date('2026-07-27T00:00:00Z'));
    fixture.componentInstance.crear();

    expect(prestamoService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ monto: 500, interes: 0, fecha_prestamo: '2026-07-27', fecha_vencimiento: null }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/prestamos']);
  });

  it('sin monto, crear() no llama al backend', async () => {
    await crearComponente();
    fixture.componentInstance['fechaPrestamo'].set(new Date());

    fixture.componentInstance.crear();

    expect(prestamoService.crear).not.toHaveBeenCalled();
  });

  it('sin fecha de prestamo, crear() no llama al backend', async () => {
    await crearComponente();
    fixture.componentInstance['monto'].set(500);
    fixture.componentInstance['fechaPrestamo'].set(null);

    fixture.componentInstance.crear();

    expect(prestamoService.crear).not.toHaveBeenCalled();
  });
});
