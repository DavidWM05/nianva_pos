import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CategoriaService } from '../../categoria.service';
import { CategoriaCrearComponent } from './categoria-crear.component';

describe('CategoriaCrearComponent', () => {
  let fixture: ComponentFixture<CategoriaCrearComponent>;
  let categoriaService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    categoriaService = { crear: vi.fn().mockReturnValue(of({ id: 3, nombre: 'Accesorios' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CategoriaCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CategoriaService, useValue: categoriaService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriaCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea la categoria y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ nombre: 'Accesorios' });

    expect(categoriaService.crear).toHaveBeenCalledWith({ nombre: 'Accesorios' });
    expect(toastService.success).toHaveBeenCalledWith('Categoría creada.');
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/categorias', 3]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    categoriaService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Accesorios' });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear la categoría.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
