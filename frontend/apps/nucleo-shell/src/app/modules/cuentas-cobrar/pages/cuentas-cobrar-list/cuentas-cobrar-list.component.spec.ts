import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuentaCobrarService, CuentasCobrarPagina } from '../../cuenta-cobrar.service';
import { CuentaCobrar } from '../../cuenta-cobrar.types';
import { CuentasCobrarListComponent } from './cuentas-cobrar-list.component';

describe('CuentasCobrarListComponent', () => {
  let fixture: ComponentFixture<CuentasCobrarListComponent>;
  let cuentaCobrarService: { listar: ReturnType<typeof vi.fn> };

  const cuentas: CuentaCobrar[] = [
    {
      id: 1,
      venta_id: 42,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      monto_total: '500.00',
      saldo_pendiente: '500.00',
      fecha_vencimiento: '2026-08-01',
      estado: 'pendiente',
      dias_vencida: 0,
      created_at: '2026-07-27T10:00:00Z',
    },
  ];

  function paginaCon(data: CuentaCobrar[] = cuentas): CuentasCobrarPagina {
    return { data, total: data.length };
  }

  async function crearComponente(): Promise<void> {
    cuentaCobrarService = { listar: vi.fn().mockReturnValue(of(paginaCon())) };

    await TestBed.configureTestingModule({
      imports: [CuentasCobrarListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CuentaCobrarService, useValue: cuentaCobrarService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentasCobrarListComponent);
    fixture.detectChanges();
  }

  it('carga las cuentas por cobrar al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(cuentaCobrarService.listar).toHaveBeenCalledTimes(1);
  });

  it('cambiar el filtro de estado vuelve a pedir la lista con filtro_estado', async () => {
    await crearComponente();

    fixture.componentInstance.onEstadoCambio('pendiente');

    expect(cuentaCobrarService.listar).toHaveBeenCalledTimes(2);
    expect(cuentaCobrarService.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      { clienteNombre: '', estado: 'pendiente', vencidas: false },
    );
  });

  it('activar "solo vencidas" vuelve a pedir la lista con vencidas=true', async () => {
    await crearComponente();

    fixture.componentInstance.onVencidasCambio(true);

    expect(cuentaCobrarService.listar).toHaveBeenCalledTimes(2);
    expect(cuentaCobrarService.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      { clienteNombre: '', estado: null, vencidas: true },
    );
  });

  it('"Ver" navega al detalle de la cuenta', async () => {
    await crearComponente();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(cuentas[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/cuentas-cobrar', 1]);
  });
});
