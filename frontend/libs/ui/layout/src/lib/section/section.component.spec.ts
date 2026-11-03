import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { FormActionsComponent } from '../form-actions/form-actions.component';
import { SectionComponent } from './section.component';

@Component({
  standalone: true,
  imports: [SectionComponent, FormActionsComponent],
  template: `
    <ui-section titulo="Datos generales"><p class="campo">Nombre</p></ui-section>
    <ui-form-actions><button type="button">Cancelar</button><button type="submit">Guardar</button></ui-form-actions>
  `,
})
class AnfitrionComponent {}

describe('SectionComponent y FormActionsComponent', () => {
  it('la seccion muestra su titulo y su contenido', () => {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('ui-section h2')?.textContent).toBe('Datos generales');
    expect(el.querySelector('ui-section .campo')).not.toBeNull();
  });

  it('la barra de acciones conserva el orden de los botones', () => {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    const botones = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ui-form-actions button')];

    expect(botones.map((b) => b.textContent)).toEqual(['Cancelar', 'Guardar']);
  });
});
