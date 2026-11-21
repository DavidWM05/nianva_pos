import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Validators } from '@angular/forms';
import { ProductoService } from '@nianva/domain-inventario';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ProductoFormComponent } from './producto-form/producto-form.component';

describe('Costo obligatorio del producto', () => {
  async function crear(edicion = false) {
    await TestBed.configureTestingModule({ imports: [ProductoFormComponent], providers: [provideAnimationsAsync(), { provide: ProductoService, useValue: { categorias: () => of([]), departamentos: () => of([]) } }] }).compileComponents();
    const fixture = TestBed.createComponent(ProductoFormComponent);
    if (edicion) fixture.componentRef.setInput('valorInicial', { id: 1, nombre: 'Producto', precio_compra: '20.00', precio_venta: '40.00' });
    fixture.detectChanges();
    const guardar = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    return { fixture, guardar, costo: fixture.componentInstance['numericos'].controls.precio_compra };
  }

  it('exige costo en alta y bloquea el envío vacío aunque el nombre sea válido', async () => {
    const { fixture, guardar, costo } = await crear();
    expect(costo.hasValidator(Validators.required)).toBe(true);
    fixture.componentInstance.onSubmit({ nombre: 'Producto' });
    expect(guardar).not.toHaveBeenCalled();
  });

  it('acepta cero explícito y lo conserva en el payload', async () => {
    const { fixture, guardar, costo } = await crear();
    costo.setValue(0);
    fixture.componentInstance.onSubmit({ nombre: 'Producto' });
    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Producto', precio_compra: 0 }));
  });

  it('al editar, omitir el costo conserva la edición parcial sin enviarlo como null', async () => {
    const { fixture, guardar, costo } = await crear(true);
    expect(costo.hasValidator(Validators.required)).toBe(false);
    costo.setValue(null);
    fixture.componentInstance.onSubmit({ nombre: 'Renombrado' });
    expect(guardar).toHaveBeenCalledWith(expect.not.objectContaining({ precio_compra: expect.anything() }));
    expect(guardar.mock.calls[0]?.[0]).not.toHaveProperty('precio_compra');
  });
});
