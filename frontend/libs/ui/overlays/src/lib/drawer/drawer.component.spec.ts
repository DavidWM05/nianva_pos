import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { PantallaService } from '@nianva/ui-layout';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrawerComponent } from './drawer.component';

@Component({
  standalone: true,
  imports: [DrawerComponent],
  template: `
    <button class="abrir" type="button" (click)="visible.set(true)">Abrir</button>
    <ui-drawer
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      (cerrado)="cerrado.set(cerrado() + 1)"
      titulo="Detalle de venta"
    >
      <p class="contenido">Contenido del detalle</p>
      <button class="accion" acciones type="button">Cerrar detalle</button>
    </ui-drawer>
  `,
})
class HostDrawerComponent {
  readonly visible = signal(false);
  readonly cerrado = signal(0);
}

describe('DrawerComponent', () => {
  const angosta = signal(false);

  beforeEach(async () => {
    angosta.set(false);
    document.body.innerHTML = '';
    await TestBed.configureTestingModule({
      imports: [HostDrawerComponent],
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
    const fixture = TestBed.createComponent(HostDrawerComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('abre desde la derecha, proyecta contenido y acciones, y cierra con el boton', async () => {
    const fixture = render();
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Contenido del detalle');
    expect(document.body.querySelector('ui-form-actions .accion')).not.toBeNull();
    expect(document.body.querySelector('.p-drawer-right')).not.toBeNull();

    const cerrar = document.body.querySelector('.p-drawer-close-button') as HTMLButtonElement;
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

  it('usa el ancho por tamano y ancho completo cuando angosta', () => {
    const fixture = TestBed.createComponent(DrawerComponent);
    const componente = fixture.componentInstance as unknown as { clase: () => string };

    fixture.componentRef.setInput('tamano', 'sm');
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-drawer ui-overlay ui-overlay--sm');

    angosta.set(true);
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-drawer ui-overlay ui-overlay--completo');
  });
});
