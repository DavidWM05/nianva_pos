import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { UnidadMedidaService } from '../../unidad-medida.service';
import { UnidadMedida } from '../../unidad-medida.types';
import { UnidadesMedidaListComponent } from './unidades-medida-list.component';

describe('UnidadesMedidaListComponent', () => {
  let fixture: ComponentFixture<UnidadesMedidaListComponent>;
  let unidadMedidaService: {
    listar: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
  };
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const unidades: UnidadMedida[] = [
    { id: 1, nombre: 'Kilogramo', abreviatura: 'kg', tipo: 'fraccionario', activo: true, created_at: '', updated_at: '' },
    { id: 2, nombre: 'Unidad', abreviatura: 'und', tipo: 'entero', activo: true, created_at: '', updated_at: '' },
  ];

  async function crearComponente(): Promise<void> {
    unidadMedidaService = {
      listar: vi.fn().mockReturnValue(of(unidades)),
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminar: vi.fn(),
    };
    confirmDialog = { confirm: vi.fn().mockResolvedValue(true) };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UnidadesMedidaListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: UnidadMedidaService, useValue: unidadMedidaService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnidadesMedidaListComponent);
    fixture.detectChanges();
  }

  it('carga y renderiza las unidades de medida al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Kilogramo');
    expect(texto).toContain('Unidad');
    expect(unidadMedidaService.listar).toHaveBeenCalledTimes(1);
  });

  it('abrirNueva() limpia el formulario para una alta (sin unidad en edición)', async () => {
    await crearComponente();

    fixture.componentInstance.abrirEditar(unidades[0]);
    fixture.componentInstance.abrirNueva();

    expect(fixture.componentInstance['unidadEnEdicion']()).toBeNull();
    expect(fixture.componentInstance['nombre']()).toBe('');
    expect(fixture.componentInstance['tipo']()).toBe('entero');
  });

  it('abrirEditar() precarga el formulario con los datos de la unidad', async () => {
    await crearComponente();

    fixture.componentInstance.abrirEditar(unidades[0]);

    expect(fixture.componentInstance['unidadEnEdicion']()).toEqual(unidades[0]);
    expect(fixture.componentInstance['nombre']()).toBe('Kilogramo');
    expect(fixture.componentInstance['abreviatura']()).toBe('kg');
    expect(fixture.componentInstance['tipo']()).toBe('fraccionario');
  });

  it('guardar() sin unidad en edición llama a crear(), no a actualizar()', async () => {
    await crearComponente();
    unidadMedidaService.crear.mockReturnValue(
      of({ id: 3, nombre: 'Litro', abreviatura: 'l', tipo: 'fraccionario', activo: true, created_at: '', updated_at: '' }),
    );

    fixture.componentInstance.abrirNueva();
    fixture.componentInstance['nombre'].set('Litro');
    fixture.componentInstance['abreviatura'].set('l');
    fixture.componentInstance.guardar();

    expect(unidadMedidaService.crear).toHaveBeenCalledWith({ nombre: 'Litro', abreviatura: 'l', tipo: 'entero', activo: true });
    expect(unidadMedidaService.actualizar).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Unidad de medida creada.');
  });

  it('guardar() con unidad en edición llama a actualizar() con su id', async () => {
    await crearComponente();
    unidadMedidaService.actualizar.mockReturnValue(of(unidades[0]));

    fixture.componentInstance.abrirEditar(unidades[0]);
    fixture.componentInstance['nombre'].set('Kilogramo (editado)');
    fixture.componentInstance.guardar();

    expect(unidadMedidaService.actualizar).toHaveBeenCalledWith(1, {
      nombre: 'Kilogramo (editado)',
      abreviatura: 'kg',
      tipo: 'fraccionario',
      activo: true,
    });
    expect(toast.success).toHaveBeenCalledWith('Unidad de medida actualizada.');
  });

  it('sin nombre o sin abreviatura, guardar() no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.abrirNueva();
    fixture.componentInstance['abreviatura'].set('l');
    fixture.componentInstance.guardar();

    expect(unidadMedidaService.crear).not.toHaveBeenCalled();
  });

  it('eliminar() pide confirmación antes de llamar al backend', async () => {
    await crearComponente();
    confirmDialog.confirm.mockResolvedValue(false);

    await fixture.componentInstance.eliminar(unidades[0]);

    expect(unidadMedidaService.eliminar).not.toHaveBeenCalled();
  });

  it('eliminar() confirmado llama al backend y refresca la lista', async () => {
    await crearComponente();
    unidadMedidaService.eliminar.mockReturnValue(of(undefined));

    await fixture.componentInstance.eliminar(unidades[0]);

    expect(unidadMedidaService.eliminar).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Unidad de medida eliminada.');
    expect(unidadMedidaService.listar).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al refrescar
  });

  it('eliminar() en uso muestra el mensaje real del error_code unidad_en_uso, no uno genérico', async () => {
    await crearComponente();
    unidadMedidaService.eliminar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { message: 'No se puede eliminar: está en uso por al menos una variante.', error_code: 'unidad_en_uso' },
          }),
      ),
    );

    await fixture.componentInstance.eliminar(unidades[0]);

    expect(toast.error).toHaveBeenCalledWith('No se puede eliminar: está en uso por al menos una variante.');
  });
});
