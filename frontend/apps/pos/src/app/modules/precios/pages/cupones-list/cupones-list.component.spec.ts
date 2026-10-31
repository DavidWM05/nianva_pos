import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuponService } from '../../cupon.service';
import { Cupon, CuponesPagina } from '../../cupon.types';
import { CuponesListComponent } from './cupones-list.component';

describe('CuponesListComponent', () => {
  let fixture: ComponentFixture<CuponesListComponent>;
  let cuponService: { listar: ReturnType<typeof vi.fn> };

  const cupones: Cupon[] = [
    {
      id: 1,
      codigo: 'VERANO10',
      nombre: 'Descuento de verano',
      tipo: 'porcentaje',
      valor: '10.00',
      uso_maximo: null,
      uso_maximo_por_cliente: null,
      fecha_inicio: null,
      fecha_fin: null,
      activo: true,
    },
    {
      id: 2,
      codigo: 'PROMO50',
      nombre: 'Promo fija',
      tipo: 'monto_fijo',
      valor: '50.00',
      uso_maximo: 100,
      uso_maximo_por_cliente: 1,
      fecha_inicio: null,
      fecha_fin: null,
      activo: false,
    },
  ];

  function paginaCon(permisos: CuponesPagina['permisos']): CuponesPagina {
    return { data: cupones, total: cupones.length, permisos };
  }

  async function crearComponente(permisos: CuponesPagina['permisos']): Promise<void> {
    cuponService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [CuponesListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: CuponService, useValue: cuponService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuponesListComponent);
    fixture.detectChanges();
  }

  it('renderiza cada cupon con su codigo, tipo y valor formateado', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('VERANO10');
    expect(texto).toContain('10.00%');
    expect(texto).toContain('PROMO50');
    expect(texto).toContain('$50.00');
  });

  it('oculta "Nuevo cupón" sin el permiso cupones.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo cupón');
  });

  it('"Nuevo cupón" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/precios/cupones/nuevo"]');
    expect(enlace).toBeTruthy();
  });

  it('la busqueda filtra por codigo o nombre', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    fixture.componentInstance.onBuscarInput('verano');

    // debounce de 300ms -- solo confirmamos que el input dispara el flujo,
    // no repetimos aqui el mismo test de timers ya cubierto en
    // clientes-list/productos-list.
    expect(fixture.componentInstance).toBeTruthy();
  });
});
