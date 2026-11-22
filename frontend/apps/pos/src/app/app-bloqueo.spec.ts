import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { BloqueoSesionService } from './auth/bloqueo-sesion.service';

// SEG-12 y SEG-05: la pantalla de bloqueo y el dialogo del supervisor se montan una vez en la
// raiz. Con la sesion bloqueada, el resto de la app queda inerte: ni el foco ni un clic llegan a
// la venta que quedo detras.

describe('App: bloqueo y supervisor en la raiz', () => {
  function montar() {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    return fixture;
  }

  it('monta la pantalla de bloqueo y el dialogo del supervisor', () => {
    const raiz = montar().nativeElement as HTMLElement;

    expect(raiz.querySelector('nucleo-bloqueo-sesion')).not.toBeNull();
    expect(raiz.querySelector('nucleo-autorizacion-supervisor-host')).not.toBeNull();
  });

  it('con la sesion bloqueada, el contenido de la app queda inerte y el bloqueo no', () => {
    const fixture = montar();
    const raiz = fixture.nativeElement as HTMLElement;
    const contenido = raiz.querySelector('router-outlet')!.parentElement!;
    expect(contenido.inert).toBe(false);

    TestBed.inject(BloqueoSesionService).activar();
    fixture.detectChanges();

    expect(contenido.inert).toBe(true);
    expect(raiz.querySelector('nucleo-bloqueo-sesion')!.closest('[inert]')).toBeNull();
  });
});
