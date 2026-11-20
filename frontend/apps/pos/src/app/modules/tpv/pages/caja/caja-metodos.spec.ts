import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { CajaService, GastoService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CajaComponent } from './caja.component';

describe('Cuadre de caja por método', () => {
  async function crear() {
    const sesion = { id: 1, sucursal_id: 1, usuario_id: 1, estado: 'abierta', monto_apertura: '50.00', monto_cierre: null, total_ventas_sistema: null, diferencia: null, fecha_apertura: '2026-11-20T12:00:00Z', fecha_cierre: null };
    const metodos = [{ metodo_pago_id: 1, nombre: 'Efectivo', total_teorico: '90.00' }, { metodo_pago_id: 2, nombre: 'Tarjeta', total_teorico: '60.00' }];
    const estado = { sesion, resumen: { ventas_count: 1, total_ventas: '100.00', total_gastos: '0.00', metodos }, permisos: { abrir: true, cerrar: true, gastos_ver: false, gastos_crear: false } };
    const cerrar = vi.fn(() => of({ sesion: { ...sesion, estado: 'cerrada', monto_cierre: '145.00', diferencia: '-5.00', metodos: [{ ...metodos[0], monto_contado: '85.00', diferencia: '-5.00' }, { ...metodos[1], monto_contado: '60.00', diferencia: '0.00' }] }, desglose: { total_gastos: '0.00', total_abonos_cxc: '0.00', total_recargas_gc: '0.00', total_pagos_cxp: '0.00' } }));
    await TestBed.configureTestingModule({ imports: [CajaComponent], providers: [provideAnimationsAsync(), provideRouter([]), { provide: CajaService, useValue: { actual: () => of(estado), cerrar } }, { provide: GastoService, useValue: { listar: () => of([]) } }, { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } }] }).compileComponents();
    const fixture = TestBed.createComponent(CajaComponent);
    fixture.detectChanges();
    const capturar = (id: number, importe: string) => {
      const host: HTMLElement = fixture.nativeElement;
      const input = host.querySelector<HTMLInputElement>('#caja-conteo-' + id);
      expect(input).not.toBeNull();
      if (!input) throw new Error('Falta el control de conteo del método.');
      input.value = importe;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    return { fixture, cerrar, capturar };
  }

  it('muestra el teórico y la diferencia por método y envía ambos conteos', async () => {
    const { fixture, cerrar, capturar } = await crear();
    expect(fixture.nativeElement.textContent).toContain('$90.00');
    expect(fixture.nativeElement.textContent).toContain('$60.00');
    capturar(1, '85');
    capturar(2, '60');
    expect(fixture.nativeElement.textContent).toContain('-$5.00');
    fixture.componentInstance.cerrarCaja();
    expect(cerrar).toHaveBeenCalledWith(1, [{ metodo_pago_id: 1, monto: 85 }, { metodo_pago_id: 2, monto: 60 }]);
  });

  it('no envía el cierre si falta un conteo o queda fuera de los límites del contrato', async () => {
    const { fixture, cerrar, capturar } = await crear();
    capturar(1, '90');
    fixture.componentInstance.cerrarCaja();
    expect(cerrar).not.toHaveBeenCalled();
    capturar(2, '-1');
    fixture.componentInstance.cerrarCaja();
    expect(cerrar).not.toHaveBeenCalled();
    capturar(2, '10000000000');
    fixture.componentInstance.cerrarCaja();
    expect(cerrar).not.toHaveBeenCalled();
  });
});