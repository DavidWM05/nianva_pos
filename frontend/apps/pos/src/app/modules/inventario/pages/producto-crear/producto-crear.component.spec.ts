import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ProductoService } from '../../producto.service';
import { ProductoCrearComponent } from './producto-crear.component';

describe('ProductoCrearComponent', () => {
  let fixture: ComponentFixture<ProductoCrearComponent>;
  let productoService: { crear: ReturnType<typeof vi.fn>; categorias: ReturnType<typeof vi.fn>; departamentos: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    productoService = {
      crear: vi.fn().mockReturnValue(of({ id: 9, nombre: 'Playera' })),
      categorias: vi.fn().mockReturnValue(of([])),
      departamentos: vi.fn().mockReturnValue(of([])),
    };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProductoCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: ProductoService, useValue: productoService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductoCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea el producto y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ nombre: 'Playera' });

    expect(productoService.crear).toHaveBeenCalledWith({ nombre: 'Playera' });
    expect(toastService.success).toHaveBeenCalledWith('Producto creado.');
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/productos', 9]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    productoService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Playera' });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear el producto.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
