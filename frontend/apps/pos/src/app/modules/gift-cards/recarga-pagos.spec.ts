import { HttpErrorResponse } from '@angular/common/http';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { GiftCardService } from '@nianva/domain-gift-cards';
import { MetodoPagoService } from '@nianva/domain-tpv';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { GiftCardDetalleComponent } from './pages/gift-card-detalle/gift-card-detalle.component';

describe('Pagos explícitos de recarga', () => {
  async function crear(falla = false) {
    const gift = { id: 5, codigo: 'GC-PRUEBA', saldo_inicial: '100.00', saldo_actual: '100.00', cliente: null, fecha_expiracion: '2030-01-01', estado: 'activa', recargas: [], created_at: '2026-11-20T12:00:00Z' };
    const recargar = vi.fn(() => falla ? throwError(() => new HttpErrorResponse({ status: 422, error: { error_code: 'caja_no_abierta', message: 'Mensaje que puede cambiar.' } })) : of(gift));
    const toast = { success: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({ imports: [GiftCardDetalleComponent], deferBlockBehavior: DeferBlockBehavior.Manual, providers: [...proveedoresDePantalla(), provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } }, { provide: GiftCardService, useValue: { obtener: () => of(gift), recargar } }, { provide: MetodoPagoService, useValue: { listar: () => of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }]) } }, { provide: AuditLogSource, useValue: { listar: () => of([]) } }, { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } }, { provide: ToastService, useValue: toast }] }).compileComponents();
    const fixture = TestBed.createComponent(GiftCardDetalleComponent);
    fixture.detectChanges();
    fixture.componentInstance.abrirRecargar();
    fixture.componentInstance['montoRecarga'].set(200);
    fixture.detectChanges();
    const pagar = () => {
      const capturar = Reflect.get(fixture.componentInstance, 'onPagosRecarga');
      if (typeof capturar !== 'function') throw new Error('La recarga debe capturar sus pagos.');
      capturar.call(fixture.componentInstance, { pagos: [{ metodo_pago_id: 1, monto: 200 }], cuadra: true, suma: 200 });
    };
    return { fixture, recargar, pagar, toast };
  }

  it('no recarga sin un desglose de pagos que cubra el monto', async () => {
    const { fixture, recargar } = await crear();
    fixture.componentInstance.confirmarRecargar();
    expect(recargar).not.toHaveBeenCalled();
  });

  it('envía los pagos junto con el importe y vuelve a cargar el detalle', async () => {
    const { fixture, recargar, pagar } = await crear();
    expect(document.querySelector('nucleo-lineas-pago')).not.toBeNull();
    pagar();
    fixture.componentInstance.confirmarRecargar();
    expect(recargar).toHaveBeenCalledWith(5, 200, [{ metodo_pago_id: 1, monto: 200 }], expect.any(String));
  });

  it('reacciona a caja_no_abierta por código sin depender del texto ni duplicar el toast', async () => {
    const { fixture, pagar, toast } = await crear(true);
    pagar();
    fixture.componentInstance.confirmarRecargar();
    fixture.detectChanges();
    expect(document.body.textContent).toContain('Abre una caja para registrar la recarga.');
    expect(toast.error).not.toHaveBeenCalled();
  });
});