import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EmptyComponent } from './empty.component';

describe('EmptyComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EmptyComponent] });
  });

  it('muestra el mensaje por defecto', () => {
    const fixture = TestBed.createComponent(EmptyComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay resultados.');
    expect(fixture.nativeElement.querySelector('i')?.className).toContain('pi-inbox');
  });

  it('permite cambiar mensaje e icono', () => {
    const fixture = TestBed.createComponent(EmptyComponent);
    fixture.componentRef.setInput('mensaje', 'Sin ventas en este periodo.');
    fixture.componentRef.setInput('icono', 'pi pi-search');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin ventas en este periodo.');
    expect(fixture.nativeElement.querySelector('i')?.className).toContain('pi-search');
  });
});
