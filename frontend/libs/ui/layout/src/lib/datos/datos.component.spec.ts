import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { PantallaService } from '../shell/pantalla.service';
import { DatosComponent } from './datos.component';

@Component({
  standalone: true,
  imports: [DatosComponent],
  template: `
    <dl uiDatos>
      <dt>Tipo</dt>
      <dd>saas</dd>
      <dt>Vence</dt>
      <dd>01/01/2027</dd>
    </dl>
  `,
})
class HostComponent {}

describe('DatosComponent', () => {
  it('proyecta pares dt/dd y conserva el host como DL', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('dl') as HTMLElement;
    expect(host).not.toBeNull();
    expect(host.querySelectorAll('dt')).toHaveLength(2);
    expect(host.querySelectorAll('dd')).toHaveLength(2);
  });

  it('aplica sus estilos a los dt/dd proyectados, no solo al host', async () => {
    // Con encapsulacion emulada, `:host dd` no alcanza al contenido proyectado
    // y el dd conserva la sangria del navegador.
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('dl') as HTMLElement;
    expect(fixture.debugElement.query(By.directive(DatosComponent))).not.toBeNull();
    expect(getComputedStyle(host).display).toBe('grid');
    expect(getComputedStyle(host.querySelector('dd') as HTMLElement).marginLeft).toBe('0px');
  });

  it('pasa a una columna con PantallaService.angosta(), sin @media propio (UI-04)', async () => {
    const angosta = signal(false);
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: PantallaService, useValue: { angosta } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('dl') as HTMLElement;

    expect(host.classList).not.toContain('ui-datos--angosta');

    angosta.set(true);
    fixture.detectChanges();

    expect(host.classList).toContain('ui-datos--angosta');
  });
});
