import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { Venta, VentasPagina, VentasPermisos } from '../../venta.types';
import { VentaService } from '../../venta.service';
import { VentasListComponent } from './ventas-list.component';

describe('VentasListComponent', () => {
  let fixture: ComponentFixture<VentasListComponent>;
  let ventaService: { listar: ReturnType<typeof vi.fn>; anular: ReturnType<typeof vi.fn> };
  let router: Router;

  const ventas: Venta[] = [
    {
      id: 1,
      fecha: '2026-07-22T10:00:00.000000Z',
      cliente: { id: 9, nombre: 'Publico General' },
      total: '330.00',
      descuento_cupon: '0.00',
      descuento_manual: '0.00',
      abono_previo: '0.00',
      estado: 'completada',
      motivo_anulacion: null,
      fecha_anulacion: null,
      es_venta_sombra: false,
      metodos_pago: [
        { metodo_pago_id: 1, nombre: 'Efectivo', monto: '200.00' },
        { metodo_pago_id: 2, nombre: 'Tarjeta', monto: '130.00' },
      ],
    },
  ];

  function paginaCon(permisos: VentasPermisos): VentasPagina {
    return { data: ventas, total: ventas.length, permisos };
  }

  async function crearComponente(permisos: VentasPermisos): Promise<void> {
    ventaService = {
      listar: vi.fn().mockReturnValue(of(paginaCon(permisos))),
      anular: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VentasListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: VentaService, useValue: ventaService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VentasListComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('renderiza el resumen de metodos de pago ("Efectivo + Tarjeta")', async () => {
    await crearComponente({ anular: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Publico General');
    expect(texto).toContain('Efectivo + Tarjeta');
  });

  it('oculta "Anular" sin el permiso ventas.anular', async () => {
    await crearComponente({ anular: false });

    expect(fixture.nativeElement.querySelector('[aria-label="Anular"]')).toBeNull();
  });

  it('"Ver detalle" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ anular: true });

    fixture.componentInstance.irADetalle(ventas[0]);

    expect(router.navigate).toHaveBeenCalledWith(['/tpv/ventas', 1]);
  });

  it('anular pide un motivo y lo envia al confirmar', async () => {
    await crearComponente({ anular: true });
    ventaService.anular.mockReturnValue(of({ ...ventas[0], estado: 'anulada' }));

    fixture.componentInstance.abrirAnulacion(ventas[0]);
    fixture.detectChanges();

    // Sin motivo, no deberia permitir confirmar.
    fixture.componentInstance.confirmarAnulacion();
    expect(ventaService.anular).not.toHaveBeenCalled();

    fixture.componentInstance['motivoAnulacion'].set('Cliente se arrepintió');
    fixture.componentInstance.confirmarAnulacion();

    expect(ventaService.anular).toHaveBeenCalledWith(1, 'Cliente se arrepintió');
  });
  it('si la venta ya estaba anulada, recarga la lista y muestra el mensaje', async () => {
    await crearComponente({ anular: true });
    const toast = TestBed.inject(ToastService);
    const errorSpy = vi.spyOn(toast, 'error');
    ventaService.anular.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { message: 'La venta ya esta anulada.', error_code: 'venta_ya_anulada' },
          }),
      ),
    );

    fixture.componentInstance.abrirAnulacion(ventas[0]);
    fixture.componentInstance['motivoAnulacion'].set('Cliente se arrepintio');
    fixture.componentInstance.confirmarAnulacion();

    expect(errorSpy).toHaveBeenCalledWith('La venta ya esta anulada.');
    expect(ventaService.listar).toHaveBeenCalledTimes(2);
  });});
