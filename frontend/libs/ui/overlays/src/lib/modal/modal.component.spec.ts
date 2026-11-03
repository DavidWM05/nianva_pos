import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { PantallaService } from '@nianva/ui-layout';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <button class="abrir" type="button" (click)="visible.set(true)">Abrir</button>
    <ui-modal
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      (cerrado)="cerrado.set(cerrado() + 1)"
      titulo="Editar producto"
    >
      <p class="contenido">Contenido del modal</p>
      <button class="accion" acciones type="button">Guardar</button>
    </ui-modal>
  `,
})
class HostModalComponent {
  readonly visible = signal(false);
  readonly cerrado = signal(0);
}

describe('ModalComponent', () => {
  const angosta = signal(false);

  beforeEach(async () => {
    angosta.set(false);
    document.body.innerHTML = '';
    await TestBed.configureTestingModule({
      imports: [HostModalComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function render() {
    const fixture = TestBed.createComponent(HostModalComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('abre, proyecta contenido y acciones, y cierra con el boton', async () => {
    const fixture = render();
    (fixture.nativeElement.querySelector('.abrir') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(true);
    expect(document.body.textContent).toContain('Contenido del modal');
    expect(document.body.querySelector('ui-form-actions .accion')).not.toBeNull();

    const cerrar = document.body.querySelector('.p-dialog-close-button') as HTMLButtonElement;
    expect(cerrar.getAttribute('aria-label')).toBe('Cerrar');
    cerrar.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(false);
    expect(fixture.componentInstance.cerrado()).toBeGreaterThan(0);
  });

  it('cierra con Escape', async () => {
    const fixture = render();
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(escape, 'which', { value: 27 });
    document.dispatchEvent(escape);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('usa el ancho de cada tamano y pantalla completa cuando angosta', () => {
    const fixture = TestBed.createComponent(ModalComponent);
    const componente = fixture.componentInstance as unknown as { clase: () => string };

    fixture.componentRef.setInput('tamano', 'sm');
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-modal ui-overlay ui-overlay--sm');

    fixture.componentRef.setInput('tamano', 'lg');
    fixture.detectChanges();
    expect(componente.clase()).toContain('ui-overlay--lg');

    angosta.set(true);
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-modal ui-overlay ui-overlay--completo');

    // La clase llega al contenedor que pinta PrimeNG (por eso el componente no encapsula).
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(document.querySelector('.p-dialog.ui-overlay--completo')).not.toBeNull();
  });

  it('vuelve a enfocar el elemento que lo abrio al cerrar', () => {
    const fixture = render();
    const abrir = fixture.nativeElement.querySelector('.abrir') as HTMLButtonElement;
    abrir.focus();
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();

    fixture.componentInstance.visible.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(abrir);
  });

  it('no requiere style en la plantilla de quien lo usa', () => {
    const fixture = render();
    const modal = fixture.nativeElement.querySelector('ui-modal') as HTMLElement;

    expect(modal.getAttribute('style')).toBeNull();
  });
});
