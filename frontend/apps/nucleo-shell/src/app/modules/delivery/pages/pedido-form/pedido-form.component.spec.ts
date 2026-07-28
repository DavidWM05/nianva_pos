import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { Usuario } from '../../../../auth/usuario.types';
import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { VentaService } from '../../../tpv/venta.service';
import { PedidoService } from '../../pedido.service';
import { Pedido } from '../../pedido.types';
import { PedidoFormComponent } from './pedido-form.component';

describe('PedidoFormComponent', () => {
  let fixture: ComponentFixture<PedidoFormComponent>;
  let pedidoService: { crear: ReturnType<typeof vi.fn> };
  let router: Router;

  const usuario: Usuario = {
    id: 1,
    nombre: 'Ana',
    apellido: null,
    correo: 'ana@test.com',
    tenant_id: 3,
    sucursal_id: 7,
    es_superadmin: false,
    roles: ['vendedor'],
    requiere_dos_factor: false,
    dos_factor_confirmado: false,
  };

  const pedidoCreado: Pedido = {
    id: 10,
    numero_pedido: 'PED-000010',
    cliente: { id: 9, nombre: 'Juan Pérez' },
    repartidor: null,
    direccion_entrega: null,
    costo_delivery: '0.00',
    estado: 'pendiente',
    tiempo_estimado: null,
    notas: null,
    fecha_entrega: null,
    created_at: '2026-07-27T10:00:00Z',
  };

  async function crearComponente(): Promise<void> {
    pedidoService = { crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PedidoFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PedidoService, useValue: pedidoService },
        { provide: AuthStateService, useValue: { usuario: () => usuario } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: VentaService, useValue: { cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })) } },
        {
          provide: BUSCADOR_CLIENTE,
          useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 9, nombre: 'Juan Pérez' })) },
        },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidoFormComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('crear() manda sucursal_id del usuario autenticado, nunca un input del formulario', async () => {
    await crearComponente();
    pedidoService.crear.mockReturnValue(of(pedidoCreado));

    fixture.componentInstance['clienteId'].set(9);
    fixture.componentInstance.crear();

    expect(pedidoService.crear).toHaveBeenCalledWith(expect.objectContaining({ cliente_id: 9, sucursal_id: 7 }));
    expect(router.navigate).toHaveBeenCalledWith(['/pedidos', 10]);
  });

  it('sin cliente seleccionado, crear() no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.crear();

    expect(pedidoService.crear).not.toHaveBeenCalled();
  });

  it('items es opcional: sin lineas agregadas, se manda undefined (no un array vacío)', async () => {
    await crearComponente();
    pedidoService.crear.mockReturnValue(of(pedidoCreado));

    fixture.componentInstance['clienteId'].set(9);
    fixture.componentInstance.crear();

    expect(pedidoService.crear).toHaveBeenCalledWith(expect.objectContaining({ items: undefined }));
  });

  it('onLineasCambio() ignora el campo descuento de LineasCotizacionComponent (Pedidos no lo tiene)', async () => {
    await crearComponente();
    pedidoService.crear.mockReturnValue(of(pedidoCreado));

    fixture.componentInstance.onLineasCambio({
      items: [{ variante_id: 5, cantidad: 2, precio_unitario: 100, descuento: 10 }],
      subtotal: 190,
    });
    fixture.componentInstance['clienteId'].set(9);
    fixture.componentInstance.crear();

    expect(pedidoService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ items: [{ variante_id: 5, cantidad: 2, precio_unitario: 100 }] }),
    );
  });
});
