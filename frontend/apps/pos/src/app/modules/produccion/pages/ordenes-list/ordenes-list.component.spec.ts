import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_RECETA } from '../../../../core/buscadores-entidad.tokens';
import { OrdenProduccionService, OrdenesPagina } from '../../orden.service';
import { OrdenProduccion } from '../../orden.types';
import { OrdenesListComponent } from './ordenes-list.component';

describe('OrdenesListComponent', () => {
  let fixture: ComponentFixture<OrdenesListComponent>;
  let ordenService: { listar: ReturnType<typeof vi.fn>; crear: ReturnType<typeof vi.fn>; cambiarEstado: ReturnType<typeof vi.fn> };
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };

  const ordenPendiente: OrdenProduccion = {
    id: 1,
    cantidad_programada: 20,
    cantidad_producida: null,
    estado: 'pendiente',
    notas: null,
    fecha_programada: null,
    fecha_completada: null,
    receta: { id: 10, nombre: 'Pan de caja' },
  };

  function paginaCon(permisos: OrdenesPagina['permisos'], data: OrdenProduccion[] = [ordenPendiente]): OrdenesPagina {
    return { data, total: data.length, permisos };
  }

  async function crearComponente(permisos: OrdenesPagina['permisos'] = { crear: true }): Promise<void> {
    ordenService = {
      listar: vi.fn().mockReturnValue(of(paginaCon(permisos))),
      crear: vi.fn(),
      cambiarEstado: vi.fn().mockReturnValue(of(undefined)),
    };
    confirmDialog = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [OrdenesListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: OrdenProduccionService, useValue: ordenService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: BUSCADOR_RECETA, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdenesListComponent);
    fixture.detectChanges();
  }

  it('carga las ordenes al iniciar y muestra el nombre de la receta', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Pan de caja');
    expect(ordenService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nueva orden" sin el permiso produccion.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nueva orden');
  });

  it('guardar() sin receta u cantidad no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.guardar();

    expect(ordenService.crear).not.toHaveBeenCalled();
  });

  it('guardar() manda el payload correcto', async () => {
    await crearComponente();
    ordenService.crear.mockReturnValue(of(ordenPendiente));

    fixture.componentInstance['recetaId'].set(10);
    fixture.componentInstance['cantidadProgramada'].set(20);
    fixture.componentInstance.guardar();

    expect(ordenService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ receta_id: 10, cantidad_programada: 20 }),
    );
  });

  it('iniciar() pide confirmacion y cambia el estado a en_proceso', async () => {
    await crearComponente();

    await fixture.componentInstance.iniciar(ordenPendiente);

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(ordenService.cambiarEstado).toHaveBeenCalledWith(1, 'en_proceso');
  });

  it('cancelar() sin confirmar no llama al backend', async () => {
    await crearComponente();
    confirmDialog.confirm.mockResolvedValue(false);

    await fixture.componentInstance.cancelar(ordenPendiente);

    expect(ordenService.cambiarEstado).not.toHaveBeenCalled();
  });

  it('confirmarCompletar() manda estado completada con la cantidad producida', async () => {
    await crearComponente();

    fixture.componentInstance.abrirCompletar(ordenPendiente);
    fixture.componentInstance['cantidadProducida'].set(18);
    fixture.componentInstance.confirmarCompletar();

    expect(ordenService.cambiarEstado).toHaveBeenCalledWith(1, 'completada', 18);
  });
});
