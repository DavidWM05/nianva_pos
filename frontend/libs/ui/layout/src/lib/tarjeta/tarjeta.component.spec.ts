import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TarjetaComponent, TarjetasComponent } from './tarjeta.component';

@Component({
  standalone: true,
  imports: [TarjetasComponent, TarjetaComponent],
  template: `
    <ul uiTarjetas aria-label="Líneas del carrito">
      <li uiTarjeta>
        <h4 class="ui-tarjeta__titulo">Línea 1: Agua 1L</h4>
        <div class="ui-tarjeta__pie"><label>Cantidad <input type="number" /></label></div>
      </li>
    </ul>
  `,
})
class HostComponent {}

// Fase 4, B1 (UI-04): una fila de una tabla editable se muestra como tarjeta en pantalla angosta.
describe('TarjetaComponent', () => {
  async function crear(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('conserva la lista y sus elementos como host, sin viñetas', async () => {
    const raiz = await crear();

    const lista = raiz.querySelector('ul') as HTMLElement;
    expect(lista.classList).toContain('ui-tarjetas');
    expect(getComputedStyle(lista).listStyleType).toBe('none');
    expect(getComputedStyle(lista).display).toBe('grid');
    expect(raiz.querySelector('li')?.classList).toContain('ui-tarjeta');
  });

  it('cada tarjeta tiene borde y el pie alinea sus controles en una fila', async () => {
    const raiz = await crear();

    const tarjeta = raiz.querySelector('li') as HTMLElement;
    expect(getComputedStyle(tarjeta).borderTopStyle).toBe('solid');
    expect(getComputedStyle(raiz.querySelector('.ui-tarjeta__pie') as HTMLElement).display).toBe('flex');
    expect(getComputedStyle(raiz.querySelector('.ui-tarjeta__pie > label') as HTMLElement).display).toBe('flex');
  });
});
