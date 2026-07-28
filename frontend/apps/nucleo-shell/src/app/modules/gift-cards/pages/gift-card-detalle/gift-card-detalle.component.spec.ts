import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList (detras de
// RecordTabsComponent) en ngAfterViewInit. Mismo stub que
// cotizacion-detalle.component.spec.ts.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { GiftCardService } from '../../gift-card.service';
import { GiftCard } from '../../gift-card.types';
import { GiftCardDetalleComponent } from './gift-card-detalle.component';

describe('GiftCardDetalleComponent', () => {
  let fixture: ComponentFixture<GiftCardDetalleComponent>;
  let giftCardService: { obtener: ReturnType<typeof vi.fn>; recargar: ReturnType<typeof vi.fn>; cancelar: ReturnType<typeof vi.fn> };
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function giftCardCon(overrides: Partial<GiftCard>): GiftCard {
    return {
      id: 5,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      codigo: 'GC-1-AAAA1111',
      saldo_inicial: '500.00',
      saldo_actual: '300.00',
      fecha_expiracion: '2030-01-01',
      estado: 'activa',
      recargas: [],
      created_at: '2026-07-27T10:00:00Z',
      ...overrides,
    };
  }

  async function crearComponente(giftCard: GiftCard): Promise<void> {
    giftCardService = {
      obtener: vi.fn().mockReturnValue(of(giftCard)),
      recargar: vi.fn(),
      cancelar: vi.fn(),
    };
    confirmDialog = { confirm: vi.fn().mockResolvedValue(true) };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GiftCardDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: GiftCardService, useValue: giftCardService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GiftCardDetalleComponent);
    fixture.detectChanges();
  }

  it('activa y no expirada: puedeRecargar() y puedeCancelar() son verdaderos', async () => {
    await crearComponente(giftCardCon({ estado: 'activa', fecha_expiracion: '2030-01-01' }));

    expect(fixture.componentInstance['puedeRecargar']()).toBe(true);
    expect(fixture.componentInstance['puedeCancelar']()).toBe(true);
  });

  it('cancelada: puedeRecargar() y puedeCancelar() son falsos', async () => {
    await crearComponente(giftCardCon({ estado: 'cancelada' }));

    expect(fixture.componentInstance['puedeRecargar']()).toBe(false);
    expect(fixture.componentInstance['puedeCancelar']()).toBe(false);
  });

  it('fecha_expiracion en el pasado: puedeRecargar() es falso aunque estado siga "activa" en BD', async () => {
    await crearComponente(giftCardCon({ estado: 'activa', fecha_expiracion: '2020-01-01' }));

    expect(fixture.componentInstance['puedeRecargar']()).toBe(false);
  });

  it('confirmarRecargar() llama a recargar() y vuelve a pedir la gift card completa (no usa la respuesta de recargar directamente)', async () => {
    await crearComponente(giftCardCon({ estado: 'activa', fecha_expiracion: '2030-01-01' }));
    // GiftCardController::recargar() devuelve el modelo via ->fresh(), sin
    // `recargas` cargado -- si el componente usara esta respuesta
    // directamente, perderia el historial. Por eso debe recargar() con
    // obtener() en vez de usar esto.
    giftCardService.recargar.mockReturnValue(of(giftCardCon({ saldo_actual: '500.00', recargas: undefined })));

    fixture.componentInstance.abrirRecargar();
    fixture.componentInstance['montoRecarga'].set(200);
    fixture.componentInstance.confirmarRecargar();

    expect(giftCardService.recargar).toHaveBeenCalledWith(5, 200);
    expect(giftCardService.obtener).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al recargar
    expect(toast.success).toHaveBeenCalledWith('Gift card recargada.');
  });

  it('confirmarRecargar() con error de negocio muestra el mensaje real', async () => {
    await crearComponente(giftCardCon({ estado: 'activa', fecha_expiracion: '2030-01-01' }));
    giftCardService.recargar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'La gift card está expirada.', error_code: 'gift_card_expirada' } })),
    );

    fixture.componentInstance.abrirRecargar();
    fixture.componentInstance['montoRecarga'].set(200);
    fixture.componentInstance.confirmarRecargar();

    expect(toast.error).toHaveBeenCalledWith('La gift card está expirada.');
  });

  it('cancelar() pide confirmación antes de llamar al backend', async () => {
    await crearComponente(giftCardCon({ estado: 'activa' }));
    confirmDialog.confirm.mockResolvedValue(false);

    await fixture.componentInstance.cancelar();

    expect(giftCardService.cancelar).not.toHaveBeenCalled();
  });

  it('cancelar() confirmado llama al backend y recarga la gift card', async () => {
    await crearComponente(giftCardCon({ estado: 'activa' }));
    giftCardService.cancelar.mockReturnValue(of(undefined));

    await fixture.componentInstance.cancelar();

    expect(giftCardService.cancelar).toHaveBeenCalledWith(5);
    expect(toast.success).toHaveBeenCalledWith('Gift card cancelada.');
    expect(giftCardService.obtener).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al recargar
  });

  it('sin recargas, muestra el mensaje de "no se ha recargado todavía"', async () => {
    await crearComponente(giftCardCon({ recargas: [] }));

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('no se ha recargado todavía');
  });

  it('con recargas, lista cada una con su monto y quién la registró', async () => {
    await crearComponente(
      giftCardCon({
        recargas: [{ id: 1, monto: '200.00', usuario: { id: 3, nombre: 'Ana' }, fecha: '2026-07-20T10:00:00Z' }],
      }),
    );

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('200.00');
    expect(texto).toContain('Ana');
  });
});
