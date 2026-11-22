import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AtajosTecladoComponent, AtajoTeclado } from './atajos-teclado.component';

@Component({
  standalone: true,
  imports: [AtajosTecladoComponent],
  template: `<ui-atajos-teclado [atajos]="atajos" />`,
})
class HostComponent {
  readonly atajos: readonly AtajoTeclado[] = [
    { teclas: ['F2'], accion: 'Buscar producto' },
    { teclas: ['F4', 'F9'], accion: 'Cobrar' },
  ];
}

// Fase 4, B1 (UI-17): los atajos de una pantalla se documentan en ella, con nombre accesible.
describe('AtajosTecladoComponent', () => {
  async function crear(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('es una lista con nombre, un elemento por atajo y cada tecla en su kbd', async () => {
    const raiz = await crear();

    const lista = raiz.querySelector('ul');
    expect(lista?.getAttribute('aria-label')).toBe('Atajos de teclado');
    const elementos = [...(lista?.querySelectorAll('li') ?? [])];
    expect(elementos.map((li) => li.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['F2 Buscar producto', 'F4 / F9 Cobrar']);
    expect([...raiz.querySelectorAll('kbd')].map((tecla) => tecla.textContent)).toEqual(['F2', 'F4', 'F9']);
  });

  it('quita las viñetas y el sangrado de la lista', async () => {
    const raiz = await crear();

    const lista = raiz.querySelector('ul') as HTMLElement;
    expect(getComputedStyle(lista).listStyleType).toBe('none');
    expect(getComputedStyle(lista).paddingLeft).toBe('0px');
  });
});
