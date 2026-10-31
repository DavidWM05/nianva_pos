import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { GiftCardService, GiftCardsPagina } from '../../gift-card.service';
import { GiftCard } from '../../gift-card.types';
import { GiftCardsListComponent } from './gift-cards-list.component';

describe('GiftCardsListComponent', () => {
  let fixture: ComponentFixture<GiftCardsListComponent>;
  let giftCardService: { listar: ReturnType<typeof vi.fn> };

  const giftCards: GiftCard[] = [
    {
      id: 1,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      codigo: 'GC-1-ABCD1234',
      saldo_inicial: '500.00',
      saldo_actual: '500.00',
      fecha_expiracion: null,
      estado: 'activa',
      created_at: '2026-07-27T10:00:00Z',
    },
  ];

  function paginaCon(data: GiftCard[] = giftCards): GiftCardsPagina {
    return { data, total: data.length };
  }

  async function crearComponente(): Promise<void> {
    giftCardService = { listar: vi.fn().mockReturnValue(of(paginaCon())) };

    await TestBed.configureTestingModule({
      imports: [GiftCardsListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: GiftCardService, useValue: giftCardService },
        { provide: BUSCADOR_CLIENTE, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GiftCardsListComponent);
    fixture.detectChanges();
  }

  it('carga las gift cards al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('GC-1-ABCD1234');
    expect(giftCardService.listar).toHaveBeenCalledTimes(1);
  });

  it('cambiar el filtro de estado vuelve a pedir la lista con filtro_estado', async () => {
    await crearComponente();

    fixture.componentInstance.onEstadoCambio('activa');

    expect(giftCardService.listar).toHaveBeenCalledTimes(2);
    expect(giftCardService.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      { clienteId: null, estado: 'activa', codigo: '' },
    );
  });

  it('seleccionar un cliente vuelve a pedir la lista con filtro_cliente_id', async () => {
    await crearComponente();

    fixture.componentInstance.onClienteSeleccionado(9);

    expect(giftCardService.listar).toHaveBeenCalledTimes(2);
    expect(giftCardService.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      { clienteId: 9, estado: null, codigo: '' },
    );
  });

  it('"Ver" navega al detalle de la gift card', async () => {
    await crearComponente();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(giftCards[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/gift-cards', 1]);
  });
});
