import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AlertComponent, TonoAlerta } from './alert.component';

describe('AlertComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AlertComponent] }).compileComponents();
  });

  function render(tono: TonoAlerta, titulo: string | null = null) {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentRef.setInput('tono', tono);
    fixture.componentRef.setInput('titulo', titulo);
    fixture.detectChanges();

    return fixture;
  }

  it('usa role alert en peligro y advertencia', () => {
    expect(render('peligro').nativeElement.getAttribute('role')).toBe('alert');
    expect(render('advertencia').nativeElement.getAttribute('role')).toBe('alert');
  });

  it('usa role status en exito e info', () => {
    expect(render('exito').nativeElement.getAttribute('role')).toBe('status');
    expect(render('info').nativeElement.getAttribute('role')).toBe('status');
  });

  it('aplica la clase del tono y muestra titulo y contenido', () => {
    const fixture = render('peligro', 'No se pudo guardar');

    expect(fixture.nativeElement.classList).toContain('ui-alert--peligro');
    expect(fixture.nativeElement.textContent).toContain('No se pudo guardar');
  });
});
