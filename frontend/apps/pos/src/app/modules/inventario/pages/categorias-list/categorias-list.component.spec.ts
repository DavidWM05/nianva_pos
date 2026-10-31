import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CategoriaService } from '../../categoria.service';
import { Categoria, CategoriasPagina } from '../../categoria.types';
import { CategoriasListComponent } from './categorias-list.component';

describe('CategoriasListComponent', () => {
  let fixture: ComponentFixture<CategoriasListComponent>;
  let categoriaService: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn> };
  let router: Router;

  const categorias: Categoria[] = [
    { id: 1, nombre: 'Playeras', descripcion: null, activo: true },
    { id: 2, nombre: 'Pantalones', descripcion: 'Mezclilla y vestir', activo: true },
  ];

  function paginaCon(permisos: CategoriasPagina['permisos']): CategoriasPagina {
    return { data: categorias, total: categorias.length, permisos };
  }

  async function crearComponente(permisos: CategoriasPagina['permisos']): Promise<void> {
    categoriaService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), desactivar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CategoriasListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: CategoriaService, useValue: categoriaService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriasListComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza las categorias de la primera carga', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Playeras');
    expect(texto).toContain('Pantalones');
    expect(categoriaService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nueva categoría" sin el permiso inventario.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nueva categoría');
  });

  it('"Nueva categoría" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/inventario/categorias/nuevo"]');
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

    fixture.componentInstance.onBuscarInput('play');
    expect(categoriaService.listar).toHaveBeenCalledTimes(1); // todavia no, esta en debounce

    vi.advanceTimersByTime(300);

    expect(categoriaService.listar).toHaveBeenCalledTimes(2);
    expect(categoriaService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), 'play');
  });
});
