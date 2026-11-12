import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeAll, describe, expect, it } from 'vitest';

import { RecordTabConfig, RecordTabsComponent } from './record-tabs.component';

// Serie 50g (bug): un @if en la raiz de una pestana creaba otro TemplateRef que la consulta
// de contenido tambien contaba, y corria el indice de las pestanas siguientes (la de
// Auditoria pintaba el aviso de General y perdia su @defer).
@Component({
  standalone: true,
  imports: [RecordTabsComponent],
  template: `
    <nucleo-record-tabs [tabs]="tabs">
      <ng-template>
        @if (aviso) {
          <p class="aviso">Solo visualizar</p>
        }
        <p class="general">General</p>
      </ng-template>
      <ng-template>
        @defer (on viewport) {
          <p class="diferido">Diferido</p>
        } @placeholder {
          <p class="auditoria">Auditoría</p>
        }
      </ng-template>
    </nucleo-record-tabs>
  `,
})
class PestanasConControlDeFlujo {
  aviso = true;
  tabs: RecordTabConfig[] = [{ label: 'General' }, { label: 'Auditoría' }];
}

describe('RecordTabsComponent (plantillas con control de flujo en la raiz)', () => {
  beforeAll(() => {
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

  it('cada pestana pinta su propio ng-template aunque empiece con un @if', async () => {
    await TestBed.configureTestingModule({
      imports: [PestanasConControlDeFlujo],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
    const fixture = TestBed.createComponent(PestanasConControlDeFlujo);
    fixture.detectChanges();

    const paneles = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.record-tabs__contenido')];

    expect(paneles).toHaveLength(2);
    expect(paneles[0].querySelector('.aviso')).not.toBeNull();
    expect(paneles[0].querySelector('.general')).not.toBeNull();
    expect(paneles[1].querySelector('.aviso')).toBeNull();
    expect(paneles[1].querySelector('.auditoria')).not.toBeNull();
    expect(await fixture.getDeferBlocks()).toHaveLength(1);
  });
});
