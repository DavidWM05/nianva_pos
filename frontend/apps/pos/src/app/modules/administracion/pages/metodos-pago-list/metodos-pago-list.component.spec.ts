import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MetodoPagoAdminService } from '../../metodo-pago-admin.service';
import { MetodoPagoAdmin, MetodosPagoPagina } from '../../metodo-pago.types';
import { MetodosPagoListComponent } from './metodos-pago-list.component';

describe('MetodosPagoListComponent', () => {
  let fixture: ComponentFixture<MetodosPagoListComponent>;
  let metodoPagoService: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn> };
  let router: Router;

  const metodosPago: MetodoPagoAdmin[] = [
    { id: 1, nombre: 'Efectivo', tipo: 'efectivo', incluir_en_financiero: true, activo: true, es_global: true },
    { id: 2, nombre: 'Vales de despensa', tipo: 'otro', incluir_en_financiero: false, activo: true, es_global: false },
  ];

  function paginaCon(permisos: MetodosPagoPagina['permisos']): MetodosPagoPagina {
    return { data: metodosPago, total: metodosPago.length, permisos };
  }

  async function crearComponente(permisos: MetodosPagoPagina['permisos']): Promise<void> {
    metodoPagoService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), desactivar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MetodosPagoListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: MetodoPagoAdminService, useValue: metodoPagoService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetodosPagoListComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza los metodos de pago de la primera carga', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Efectivo');
    expect(texto).toContain('Vales de despensa');
    expect(metodoPagoService.listar).toHaveBeenCalledTimes(1);
  });

  it('"Nuevo método de pago" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/metodos-pago/nuevo"]');
    expect(enlace).toBeTruthy();
  });

  it('una fila global nunca muestra el boton de desactivar, aunque el usuario tenga el permiso', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const botonesDesactivar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Desactivar"]');
    // Solo 1 fila (Vales de despensa) puede desactivarse -- Efectivo es global.
    expect(botonesDesactivar.length).toBe(1);
  });

  it('una fila global SI muestra el boton de editar (navega al detalle de solo lectura)', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const botonesEditar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Editar"]');
    expect(botonesEditar.length).toBe(2);
  });

  it('la busqueda (con debounce) vuelve a pedir la lista con el filtro de nombre', async () => {
    vi.useFakeTimers();
    await crearComponente({ crear: true, editar: true, eliminar: true });

    fixture.componentInstance.onBuscarInput('vale');
    expect(metodoPagoService.listar).toHaveBeenCalledTimes(1); // todavia no, esta en debounce

    vi.advanceTimersByTime(300);

    expect(metodoPagoService.listar).toHaveBeenCalledTimes(2);
    expect(metodoPagoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), 'vale');
  });
});
