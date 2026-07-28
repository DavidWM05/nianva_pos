import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { GiftCardService } from '../../gift-card.service';
import { GiftCard } from '../../gift-card.types';
import { GiftCardFormComponent } from './gift-card-form.component';

describe('GiftCardFormComponent', () => {
  let fixture: ComponentFixture<GiftCardFormComponent>;
  let giftCardService: { emitir: ReturnType<typeof vi.fn> };
  let router: Router;

  const giftCardCreada: GiftCard = {
    id: 10,
    cliente: null,
    codigo: 'GC-1-ZZZZ9999',
    saldo_inicial: '300.00',
    saldo_actual: '300.00',
    fecha_expiracion: null,
    estado: 'activa',
    created_at: '2026-07-27T10:00:00Z',
  };

  async function crearComponente(): Promise<void> {
    giftCardService = { emitir: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GiftCardFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: GiftCardService, useValue: giftCardService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: BUSCADOR_CLIENTE, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GiftCardFormComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('emitir() manda cliente_id null cuando no se selecciona cliente (gift card anonima)', async () => {
    await crearComponente();
    giftCardService.emitir.mockReturnValue(of(giftCardCreada));

    fixture.componentInstance['monto'].set(300);
    fixture.componentInstance.emitir();

    expect(giftCardService.emitir).toHaveBeenCalledWith({ cliente_id: null, monto: 300, fecha_expiracion: null });
    expect(router.navigate).toHaveBeenCalledWith(['/gift-cards', 10]);
  });

  it('sin monto, emitir() no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.emitir();

    expect(giftCardService.emitir).not.toHaveBeenCalled();
  });

  it('emitir() manda la fecha de expiracion en formato yyyy-mm-dd', async () => {
    await crearComponente();
    giftCardService.emitir.mockReturnValue(of(giftCardCreada));

    fixture.componentInstance['monto'].set(300);
    fixture.componentInstance['fechaExpiracion'].set(new Date('2026-12-01T00:00:00Z'));
    fixture.componentInstance.emitir();

    expect(giftCardService.emitir).toHaveBeenCalledWith(
      expect.objectContaining({ fecha_expiracion: '2026-12-01' }),
    );
  });
});
