import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BotonCrearComponent } from './btn-crear.component';

describe('BotonCrearComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BotonCrearComponent],
      providers: [provideRouter([])],
    });
  });

  function render(objeto: string, genero: 'm' | 'f' = 'm', ruta?: string) {
    const fixture = TestBed.createComponent(BotonCrearComponent);
    fixture.componentRef.setInput('objeto', objeto);
    fixture.componentRef.setInput('genero', genero);
    if (ruta !== undefined) {
      fixture.componentRef.setInput('ruta', ruta);
    }
    fixture.detectChanges();

    return fixture;
  }

  it('usa Nuevo/Nueva y el icono de crear', () => {
    expect(render('producto').nativeElement.textContent).toContain('Nuevo producto');
    expect(render('orden', 'f').nativeElement.textContent).toContain('Nueva orden');
    expect(render('producto').nativeElement.querySelector('i')?.className).toContain('pi-plus');
  });

  it('emite crear cuando no hay ruta', () => {
    const fixture = render('producto');
    const emitir = vi.fn();
    fixture.componentInstance.crear.subscribe(emitir);

    fixture.nativeElement.querySelector('button')?.click();

    expect(emitir).toHaveBeenCalledOnce();
  });

  it('con ruta no emite crear', () => {
    const fixture = render('producto', 'm', '/productos/nuevo');
    const emitir = vi.fn();
    fixture.componentInstance.crear.subscribe(emitir);

    (fixture.componentInstance as unknown as { onClick: () => void }).onClick();

    expect(emitir).not.toHaveBeenCalled();
  });
});
