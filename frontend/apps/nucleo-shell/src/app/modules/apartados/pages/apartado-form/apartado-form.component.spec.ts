import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { VentaService } from '../../../tpv/venta.service';
import { ApartadoService } from '../../apartado.service';
import { ApartadoFormComponent } from './apartado-form.component';

describe('ApartadoFormComponent', () => {
  let fixture: ComponentFixture<ApartadoFormComponent>;
  let apartadoService: { crear: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    apartadoService = { crear: vi.fn().mockReturnValue(of({ id: 42 })) };

    await TestBed.configureTestingModule({
      imports: [ApartadoFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: ApartadoService, useValue: apartadoService },
        { provide: VentaService, useValue: { cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })) } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        { provide: BUSCADOR_CLIENTE, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApartadoFormComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  it('sin cliente ni lineas, "Crear apartado" queda deshabilitado', async () => {
    await crearComponente();

    expect(fixture.componentInstance['clienteId']()).toBeNull();
    expect(fixture.componentInstance['itemsActuales']()).toEqual([]);
  });

  it('con cliente y lineas, crea el apartado y navega a su vista de registro', async () => {
    await crearComponente();
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance['clienteId'].set(9);
    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });

    fixture.componentInstance.crearApartado();

    expect(apartadoService.crear).toHaveBeenCalledWith({
      cliente_id: 9,
      items: [{ variante_id: 5, cantidad: 2 }],
      fecha_vencimiento: null,
      notas: null,
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/apartados', 42]);
  });
});
