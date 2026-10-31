import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { NotaCreditoService, NotasCreditoPagina } from '../../nota-credito.service';
import { NotaCredito } from '../../nota-credito.types';
import { NotasCreditoListComponent } from './notas-credito-list.component';

describe('NotasCreditoListComponent', () => {
  let fixture: ComponentFixture<NotasCreditoListComponent>;
  let notaCreditoService: { listar: ReturnType<typeof vi.fn> };

  const notas: NotaCredito[] = [
    {
      id: 1,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      devolucion_id: 3,
      monto_original: '200.00',
      saldo_disponible: '200.00',
      fecha_expiracion: '2026-12-01',
      estado: 'activa',
      created_at: '2026-07-27T10:00:00Z',
    },
  ];

  function paginaCon(data: NotaCredito[] = notas): NotasCreditoPagina {
    return { data, total: data.length };
  }

  async function crearComponente(): Promise<void> {
    notaCreditoService = { listar: vi.fn().mockReturnValue(of(paginaCon())) };

    await TestBed.configureTestingModule({
      imports: [NotasCreditoListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: NotaCreditoService, useValue: notaCreditoService },
        { provide: BUSCADOR_CLIENTE, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotasCreditoListComponent);
    fixture.detectChanges();
  }

  it('carga las notas de crédito al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(notaCreditoService.listar).toHaveBeenCalledTimes(1);
  });

  it('seleccionar un cliente vuelve a pedir la lista con filtro_cliente_id', async () => {
    await crearComponente();

    fixture.componentInstance.onClienteSeleccionado(9);

    expect(notaCreditoService.listar).toHaveBeenCalledTimes(2);
    expect(notaCreditoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), { clienteId: 9 });
  });

  it('"Ver" navega al detalle de la nota de crédito', async () => {
    await crearComponente();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(notas[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/notas-credito', 1]);
  });
});
