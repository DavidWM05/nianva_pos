import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { RecordTabConfig, RecordTabsComponent } from './record-tabs.component';

// Serie 50d: comportamiento visible de las pestanas, sin depender de la libreria que las
// dibuja. Debe pasar igual antes y despues de quitar PrimeNG.
@Component({
  standalone: true,
  imports: [RecordTabsComponent],
  template: `
    <nucleo-record-tabs [tabs]="tabs">
      <ng-template><p class="contenido-general">Contenido general</p></ng-template>
      <ng-template><p class="contenido-detalle">Contenido detalle</p></ng-template>
      <ng-template>
        @defer (on viewport) {
          <p class="contenido-diferido">Diferido</p>
        } @placeholder {
          <p class="contenido-placeholder">Se carga al verse</p>
        }
      </ng-template>
    </nucleo-record-tabs>
  `,
})
class AnfitrionPestanas {
  tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-info-circle' },
    { label: 'Detalle' },
    { label: 'Auditoría' },
  ];
}

describe('RecordTabsComponent (comportamiento)', () => {
  let fixture: ComponentFixture<AnfitrionPestanas>;

  beforeAll(() => {
    // jsdom no trae ResizeObserver ni IntersectionObserver; las barras de pestanas y el
    // @defer (on viewport) los usan.
    const nada = (): void => undefined;
    globalThis.ResizeObserver ??= class {
      observe = nada;
      unobserve = nada;
      disconnect = nada;
    } as unknown as typeof ResizeObserver;
    globalThis.IntersectionObserver ??= class {
      observe = nada;
      unobserve = nada;
      disconnect = nada;
      takeRecords = (): IntersectionObserverEntry[] => [];
    } as unknown as typeof IntersectionObserver;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnfitrionPestanas],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(AnfitrionPestanas);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const pestanas = (): HTMLElement[] => [...raiz().querySelectorAll<HTMLElement>('[role="tab"]')];
  const oculto = (selector: string): boolean => raiz().querySelector(selector)?.closest('[hidden]') !== null;

  it('pinta una pestana con role=tab por cada entrada, con su etiqueta', () => {
    expect(pestanas().map((p) => p.textContent?.trim())).toEqual(['General', 'Detalle', 'Auditoría']);
  });

  it('pinta el icono de la pestana que lo declara', () => {
    expect(pestanas()[0].querySelector('i.pi.pi-info-circle')).not.toBeNull();
    expect(pestanas()[1].querySelector('i')).toBeNull();
  });

  it('la primera pestana empieza seleccionada y solo su panel es visible', () => {
    expect(pestanas().map((p) => p.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(oculto('.contenido-general')).toBe(false);
    expect(oculto('.contenido-detalle')).toBe(true);
  });

  it('al hacer clic en otra pestana cambia la seleccion y el panel visible', async () => {
    pestanas()[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(pestanas().map((p) => p.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(oculto('.contenido-general')).toBe(true);
    expect(oculto('.contenido-detalle')).toBe(false);
  });

  it('todas las pestanas existen desde el inicio: el @defer de la ultima ya esta en el arbol', async () => {
    expect(raiz().querySelector('.contenido-detalle')).not.toBeNull();
    expect(raiz().querySelector('.contenido-placeholder')).not.toBeNull();
    expect(await fixture.getDeferBlocks()).toHaveLength(1);
  });

  it('cada panel visible esta dentro de un elemento role=tabpanel', () => {
    expect(raiz().querySelector('.contenido-general')?.closest('[role="tabpanel"]')).not.toBeNull();
  });
});
