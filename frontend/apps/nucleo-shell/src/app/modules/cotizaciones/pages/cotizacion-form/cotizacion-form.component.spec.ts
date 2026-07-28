import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, convertToParamMap, provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { Usuario } from '../../../../auth/usuario.types';
import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { VentaService } from '../../../tpv/venta.service';
import { CotizacionService } from '../../cotizacion.service';
import { Cotizacion } from '../../cotizacion.types';
import { CotizacionFormComponent } from './cotizacion-form.component';

describe('CotizacionFormComponent', () => {
  let fixture: ComponentFixture<CotizacionFormComponent>;
  let cotizacionService: { obtener: ReturnType<typeof vi.fn>; crear: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };
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

  const cotizacionExistente: Cotizacion = {
    id: 5,
    numero_cotizacion: 'COT-000005',
    cliente: { id: 9, nombre: 'Juan Pérez' },
    total: '500.00',
    descuento: '0.00',
    estado: 'pendiente',
    validez_dias: 15,
    fecha_vencimiento: '2026-08-15',
    observaciones: null,
    uso_cfdi: null,
    venta_id: null,
    detalles: [],
    created_at: '2026-07-27T10:00:00Z',
    updated_at: '2026-07-27T10:00:00Z',
  };

  async function crearComponente(idRuta: string | null): Promise<void> {
    cotizacionService = {
      obtener: vi.fn().mockReturnValue(of(cotizacionExistente)),
      crear: vi.fn(),
      actualizar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CotizacionFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CotizacionService, useValue: cotizacionService },
        { provide: AuthStateService, useValue: { usuario: () => usuario } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: VentaService, useValue: { cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })) } },
        {
          provide: BUSCADOR_CLIENTE,
          useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 9, nombre: 'Juan Pérez' })) },
        },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(idRuta ? { id: idRuta } : {}) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CotizacionFormComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('sin :id en la ruta, arranca en modo crear (formulario vacío, no pide la cotización)', async () => {
    await crearComponente(null);

    expect(fixture.componentInstance['editando']()).toBe(false);
    expect(cotizacionService.obtener).not.toHaveBeenCalled();
  });

  it('con :id en la ruta, arranca en modo editar y precarga los datos de la cotización', async () => {
    await crearComponente('5');

    expect(fixture.componentInstance['editando']()).toBe(true);
    expect(cotizacionService.obtener).toHaveBeenCalledWith(5);
    expect(fixture.componentInstance['clienteId']()).toBe(9);
    expect(fixture.componentInstance['validezDias']()).toBe(15);
  });

  it('guardar() en modo crear manda sucursal_id del usuario autenticado, nunca un input del formulario', async () => {
    await crearComponente(null);
    cotizacionService.crear.mockReturnValue(of({ ...cotizacionExistente, id: 10 }));

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 1, precio_unitario: 100, descuento: 0 }], subtotal: 100 });
    fixture.componentInstance.guardar();

    expect(cotizacionService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ sucursal_id: 7, items: [{ variante_id: 5, cantidad: 1, precio_unitario: 100, descuento: 0 }] }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/cotizaciones', 10]);
  });

  it('guardar() en modo editar llama a actualizar() con el id de la ruta, no a crear()', async () => {
    await crearComponente('5');
    cotizacionService.actualizar.mockReturnValue(of(cotizacionExistente));

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 1, precio_unitario: 100, descuento: 0 }], subtotal: 100 });
    fixture.componentInstance.guardar();

    expect(cotizacionService.actualizar).toHaveBeenCalledWith(5, expect.objectContaining({ cliente_id: 9 }));
    expect(cotizacionService.crear).not.toHaveBeenCalled();
  });

  it('sin lineas, guardar() no llama al backend', async () => {
    await crearComponente(null);

    fixture.componentInstance.guardar();

    expect(cotizacionService.crear).not.toHaveBeenCalled();
  });
});
