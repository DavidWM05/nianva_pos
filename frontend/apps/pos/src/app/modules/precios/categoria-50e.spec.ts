import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EntidadSelectorComponent } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { expect, it, vi } from 'vitest';

import { BUSCADOR_CATEGORIA, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ReglaPrecioFormComponent } from './regla-precio-form/regla-precio-form.component';

it('categoría usa su buscador, conserva el valor inicial y readonly, y comunica la selección', async () => {
  const buscadorCategoria = { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 17, nombre: 'Granel' })) };
  await TestBed.configureTestingModule({
    imports: [ReglaPrecioFormComponent],
    providers: [
      ...proveedoresDePantalla(),
      { provide: BUSCADOR_CATEGORIA, useValue: buscadorCategoria },
      { provide: BUSCADOR_PRODUCTO, useValue: {} },
      { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: {} },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ReglaPrecioFormComponent);
  fixture.componentRef.setInput('valorInicial', { aplica_a: 'categoria', categoria: { id: 17, nombre: 'Granel' } });
  fixture.componentRef.setInput('readonly', true);
  fixture.detectChanges();
  const elemento = fixture.debugElement.query(By.directive(EntidadSelectorComponent));
  expect(elemento).not.toBeNull();
  const selector: EntidadSelectorComponent = elemento.componentInstance;
  expect(selector.buscador).toBe(buscadorCategoria);
  expect(selector.valorInicial).toBe(17);
  expect(selector.disabled).toBe(true);
  fixture.componentRef.setInput('readonly', false);
  fixture.detectChanges();
  expect(selector.disabled).toBe(false);
  const guardar = vi.fn();
  fixture.componentInstance.guardar.subscribe(guardar);
  selector.seleccionado.emit(22);
  fixture.componentInstance.onSubmit({ nombre: 'Promoción', tipo: 'porcentaje', valor: 10 });
  expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ categoria_id: 22, aplica_a: 'categoria' }));
});
