import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ConfirmDialogService, ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DepartamentoService } from '../../departamento.service';
import { Departamento, DepartamentosPagina } from '../../departamento.types';
import { DepartamentosListComponent } from './departamentos-list.component';

describe('DepartamentosListComponent', () => {
  let fixture: ComponentFixture<DepartamentosListComponent>;
  let departamentoService: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn> };
  let router: Router;

  const departamentos: Departamento[] = [
    { id: 1, nombre: 'Damas', descripcion: null, activo: true },
    { id: 2, nombre: 'Caballeros', descripcion: 'Ropa formal e informal', activo: true },
  ];

  function paginaCon(permisos: DepartamentosPagina['permisos']): DepartamentosPagina {
    return { data: departamentos, total: departamentos.length, permisos };
  }

  async function crearComponente(permisos: DepartamentosPagina['permisos']): Promise<void> {
    departamentoService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), desactivar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DepartamentosListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: DepartamentoService, useValue: departamentoService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DepartamentosListComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza los departamentos de la primera carga', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Damas');
    expect(texto).toContain('Caballeros');
    expect(departamentoService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nuevo departamento" sin el permiso inventario.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo departamento');
  });

  it('"Nuevo departamento" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/inventario/departamentos/nuevo"]');
    expect(enlace).toBeTruthy();
  });

  it('sin el permiso inventario.eliminar, ninguna fila muestra el boton de desactivar', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: false });

    const botonesDesactivar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Desactivar"]');
    expect(botonesDesactivar.length).toBe(0);
  });

  it('la busqueda (con debounce) vuelve a pedir la lista con el filtro de nombre', async () => {
    vi.useFakeTimers();
    await crearComponente({ crear: true, editar: true, eliminar: true });

    fixture.componentInstance.onBuscarInput('dama');
    expect(departamentoService.listar).toHaveBeenCalledTimes(1); // todavia no, esta en debounce

    vi.advanceTimersByTime(300);

    expect(departamentoService.listar).toHaveBeenCalledTimes(2);
    expect(departamentoService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), 'dama');
  });
});
