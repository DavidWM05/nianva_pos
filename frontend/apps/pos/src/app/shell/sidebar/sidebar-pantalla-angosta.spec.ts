import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PantallaService } from '@nianva/ui-layout';
import { beforeEach, describe, expect, it } from 'vitest';

import { NUCLEO_ITEM_INICIO } from '../../modules/modules.config';
import { SidebarComponent } from './sidebar.component';

// En pantalla angosta el menu se abre como panel desde ui-shell: colapsarlo
// ahi dejaria solo iconos, asi que el sidebar se muestra siempre completo.
describe('SidebarComponent en pantalla angosta', () => {
  const angosta = signal(true);

  beforeEach(() => {
    angosta.set(true);
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } }],
    });
  });

  function crear() {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('se ve completo aunque el usuario lo haya colapsado en escritorio', () => {
    const { fixture, el } = crear();

    fixture.componentInstance.toggleCollapsed();
    fixture.detectChanges();

    expect(el.querySelector('.sidebar')?.classList).not.toContain('sidebar--collapsed');
    expect(el.textContent).toContain(NUCLEO_ITEM_INICIO.label);
  });
});
