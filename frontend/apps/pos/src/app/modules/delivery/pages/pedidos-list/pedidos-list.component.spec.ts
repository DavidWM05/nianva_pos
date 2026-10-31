import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE, BUSCADOR_USUARIO } from '../../../../core/buscadores-entidad.tokens';
import { PedidoService, PedidosPagina } from '../../pedido.service';
import { Pedido } from '../../pedido.types';
import { PedidosListComponent } from './pedidos-list.component';

describe('PedidosListComponent', () => {
  let fixture: ComponentFixture<PedidosListComponent>;
  let pedidoService: { listar: ReturnType<typeof vi.fn> };

  const pedidos: Pedido[] = [
    {
      id: 1,
      numero_pedido: 'PED-000001',
      cliente: { id: 9, nombre: 'Juan Pérez' },
      repartidor: null,
      direccion_entrega: null,
      costo_delivery: '30.00',
      estado: 'pendiente',
      tiempo_estimado: null,
      notas: null,
      fecha_entrega: null,
      created_at: '2026-07-27T10:00:00Z',
    },
  ];

  function paginaCon(permisos: PedidosPagina['permisos']): PedidosPagina {
    return { data: pedidos, total: pedidos.length, permisos };
  }

  async function crearComponente(permisos: PedidosPagina['permisos'] = { crear: true }): Promise<void> {
    pedidoService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [PedidosListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PedidoService, useValue: pedidoService },
        { provide: BUSCADOR_CLIENTE, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_USUARIO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidosListComponent);
    fixture.detectChanges();
  }

  it('carga los pedidos al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('PED-000001');
    expect(pedidoService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nuevo pedido" sin el permiso pedidos.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo pedido');
  });

  it('cambiar el filtro de estado vuelve a pedir la lista con filtro_estado', async () => {
    await crearComponente();

    fixture.componentInstance.onEstadoCambio('preparando');

    expect(pedidoService.listar).toHaveBeenCalledTimes(2);
    expect(pedidoService.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      { numeroPedido: '', estado: 'preparando', clienteId: null, repartidorId: null },
    );
  });

  it('"Ver" navega al detalle del pedido', async () => {
    await crearComponente();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(pedidos[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/pedidos', 1]);
  });
});
