import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuentaPagarService, CuentasPagarPagina } from '../../cuenta-pagar.service';
import { CuentaPagar } from '../../cuenta-pagar.types';
import { CuentasPagarListComponent } from './cuentas-pagar-list.component';

describe('CuentasPagarListComponent', () => {
  let fixture: ComponentFixture<CuentasPagarListComponent>;
  let cuentaPagarService: { listar: ReturnType<typeof vi.fn> };

  const cuentas: CuentaPagar[] = [
    {
      id: 1,
      compra_id: 42,
      proveedor: { id: 7, razon_social: 'Textiles del Norte' },
      monto_total: '1000.00',
      saldo_pendiente: '1000.00',
      fecha_vencimiento: '2026-08-01',
      estado: 'pendiente',
      created_at: '2026-07-27T10:00:00Z',
    },
  ];

  function paginaCon(data: CuentaPagar[] = cuentas): CuentasPagarPagina {
    return { data, total: data.length };
  }

  async function crearComponente(): Promise<void> {
    cuentaPagarService = { listar: vi.fn().mockReturnValue(of(paginaCon())) };

    await TestBed.configureTestingModule({
      imports: [CuentasPagarListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CuentaPagarService, useValue: cuentaPagarService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentasPagarListComponent);
    fixture.detectChanges();
  }

  it('carga las cuentas por pagar al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Textiles del Norte');
    expect(cuentaPagarService.listar).toHaveBeenCalledTimes(1);
  });

  it('cambiar el filtro de estado vuelve a pedir la lista con filtro_estado', async () => {
    await crearComponente();

    fixture.componentInstance.onEstadoCambio('pendiente');

    expect(cuentaPagarService.listar).toHaveBeenCalledTimes(2);
    expect(cuentaPagarService.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      { proveedorNombre: '', estado: 'pendiente' },
    );
  });

  it('"Ver" navega al detalle de la cuenta', async () => {
    await crearComponente();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(cuentas[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/cuentas-pagar', 1]);
  });
});
