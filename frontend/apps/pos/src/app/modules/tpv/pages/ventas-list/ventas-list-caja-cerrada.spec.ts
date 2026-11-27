import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { Venta, VentaService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { VentasListComponent } from './ventas-list.component';

describe('Anulación después del corte en el listado de ventas', () => {
  it('indica registrar una devolución al recibir el error_code aunque el mensaje sea distinto', async () => {
    const venta: Venta = {
      id: ulidDePrueba(1),
      folio: 'V-1-1',
      fecha: '2026-07-22T10:00:00Z',
      cliente: { id: ulidDePrueba(2), nombre: 'Público general' },
      total: '100.00',
      descuento_cupon: '0.00',
      descuento_manual: '0.00',
      abono_previo: '0.00',
      estado: 'completada',
      motivo_anulacion: null,
      fecha_anulacion: null,
      es_venta_sombra: false,
      metodos_pago: [],
    };
    const listar = vi.fn().mockReturnValue(of({ data: [venta], total: 1, permisos: { anular: true } }));
    const error = vi.fn();
    const ejecutar = vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      error: { error_code: 'anulacion_requiere_devolucion', message: 'Texto distinto del servidor' },
    })));
    await TestBed.configureTestingModule({
      imports: [VentasListComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: VentaService, useValue: { listar } },
        { provide: ToastService, useValue: { error } },
        { provide: AutorizacionSupervisorService, useValue: { ejecutar } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VentasListComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    componente.abrirAnulacion(venta);
    componente['motivoAnulacion'].set('Prueba de devolución');
    componente.confirmarAnulacion();

    expect(error).toHaveBeenCalledWith('La caja de esta venta ya está cerrada. Registra una devolución.');
    expect(listar).toHaveBeenCalledTimes(2);
  });
});
