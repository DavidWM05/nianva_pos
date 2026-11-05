import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PantallaService } from '@nianva/ui-layout';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrawerComponent } from './drawer/drawer.component';

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
      [tamano]="tamano()"
    >
      <p class="contenido">Contenido del detalle</p>
      <button class="accion" acciones type="button">Cerrar detalle</button>
    </ui-drawer>
  `,
})
class HostDrawerComponent {
  readonly visible = signal(false);
  readonly tamano = signal<'sm' | 'md' | 'lg'>('md');
  readonly cerrado = signal(0);
}

type Interno = {
  clase: () => string;
};

describe('DrawerComponent comportamiento', () => {
  const angosta = signal(false);

  beforeEach(async () => {
    angosta.set(false);
    document.body.innerHTML = '';
    await TestBed.configureTestingModule({
      imports: [HostDrawerComponent],
      providers: [
        provideAnimationsAsync(),        { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function abrir(): Promise<ReturnType<typeof TestBed.createComponent<HostDrawerComponent>>> {
    const fixture = TestBed.createComponent(HostDrawerComponent);
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture;
  }

  async function esperarCierre(fixture: ReturnType<typeof TestBed.createComponent<HostDrawerComponent>>): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 250));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('abre desde el lado derecho, proyecta contenido y acciones, y cierra con el boton', async () => {
    const fixture = await abrir();

    expect(document.body.textContent).toContain('Detalle de venta');
    expect(document.body.textContent).toContain('Contenido del detalle');
    expect(document.body.querySelector('ui-form-actions .accion')).not.toBeNull();
    expect(document.body.querySelector('.ui-drawer')).not.toBeNull();

    const cerrar = document.body.querySelector('[aria-label="Cerrar"]') as HTMLButtonElement;
    expect(cerrar).not.toBeNull();
    cerrar.click();
    await esperarCierre(fixture);

    expect(fixture.componentInstance.visible()).toBe(false);
    expect(fixture.componentInstance.cerrado()).toBeGreaterThan(0);
  });

  it('cierra con Escape', async () => {
    const fixture = await abrir();

    // Desde dentro del drawer, donde esta el foco al abrirlo: Escape no se escucha en el
    // documento, para que un modal encima cierre primero (overlays-teclado.spec.ts).
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(escape, 'which', { value: 27 });
    (document.querySelector('.ui-drawer__panel') as HTMLElement).dispatchEvent(escape);
    await esperarCierre(fixture);

    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('usa el ancho por tamano y ancho completo cuando angosta', async () => {
    const fixture = TestBed.createComponent(DrawerComponent);
    const componente = fixture.componentInstance as unknown as Interno;

    fixture.componentRef.setInput('tamano', 'sm');
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-drawer ui-overlay ui-overlay--sm');

    angosta.set(true);
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-drawer ui-overlay ui-overlay--completo');

    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('.ui-overlay--completo')).not.toBeNull();
  });

  it('vuelve a enfocar el elemento que lo abrio al cerrar', async () => {
    const fixture = TestBed.createComponent(HostDrawerComponent);
    const abrir = fixture.nativeElement.querySelector('.abrir') as HTMLButtonElement;
    abrir.focus();
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.visible.set(false);
    await esperarCierre(fixture);

    expect(document.activeElement).toBe(abrir);
  });
});
