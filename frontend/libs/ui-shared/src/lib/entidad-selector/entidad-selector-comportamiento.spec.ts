import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EntidadSelectorComponent } from './entidad-selector.component';
import { BuscadorDeHijos, BuscadorEntidad, EntidadBuscable } from './entidad-selector.types';

// Serie 50d: comportamiento visible del selector, sin depender de la libreria del
// autocompletado. Debe pasar igual antes y despues de quitar PrimeNG.
const ENTIDAD: EntidadBuscable = { id: 1, nombre: 'Producto uno' };
const OTRA: EntidadBuscable = { id: 2, nombre: 'Producto dos' };
const HIJOS: EntidadBuscable[] = [
  { id: 10, nombre: 'Chica / Roja' },
  { id: 11, nombre: 'Grande / Azul' },
];

describe('EntidadSelectorComponent (comportamiento)', () => {
  let fixture: ComponentFixture<EntidadSelectorComponent>;
  let component: EntidadSelectorComponent;
  let buscador: { buscar: ReturnType<typeof vi.fn>; obtener: ReturnType<typeof vi.fn> };
  let buscadorHijos: { hijosDe: ReturnType<typeof vi.fn> };

  beforeAll(() => {
    // jsdom no trae matchMedia y algunos overlays lo consultan al abrirse.
    window.matchMedia ??= ((consulta: string) =>
      ({
        matches: false,
        media: consulta,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
  });

  beforeEach(async () => {
    buscador = {
      buscar: vi.fn().mockReturnValue(of([ENTIDAD, OTRA])),
      obtener: vi.fn().mockReturnValue(of(ENTIDAD)),
    };
    buscadorHijos = { hijosDe: vi.fn().mockReturnValue(of(HIJOS)) };

    await TestBed.configureTestingModule({
      imports: [EntidadSelectorComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(EntidadSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('buscador', buscador as unknown as BuscadorEntidad);
    fixture.componentRef.setInput('placeholder', 'Buscar producto por nombre...');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const entrada = (): HTMLInputElement =>
    raiz().querySelector<HTMLInputElement>('input[placeholder="Buscar producto por nombre..."]') as HTMLInputElement;
  // Como un usuario: el input tiene el foco mientras se escribe.
  const escribir = (texto: string): void => {
    entrada().focus();
    entrada().value = texto;
    entrada().dispatchEvent(new Event('input', { bubbles: true }));
  };
  const opciones = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const estabilizar = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('pinta un input con el placeholder, y el label apunta a el', async () => {
    await estabilizar();

    const label = raiz().querySelector('label[for]');
    expect(entrada()).not.toBeNull();
    expect(document.getElementById(label?.getAttribute('for') ?? '')).toBe(entrada());
    expect(label?.textContent?.trim()).toBe('Buscar');
  });

  it('escribir busca una sola vez despues de la pausa, con el ultimo texto', async () => {
    await estabilizar();
    vi.useFakeTimers();

    escribir('p');
    escribir('pr');
    escribir('pro');
    vi.advanceTimersByTime(100);
    expect(buscador.buscar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(buscador.buscar).toHaveBeenCalledTimes(1);
    expect(buscador.buscar).toHaveBeenCalledWith('pro');
  });

  it('elegir una sugerencia emite su id y la muestra en el input', async () => {
    await estabilizar();
    const emitidos: Array<number | null> = [];
    component.seleccionado.subscribe((id) => emitidos.push(id));

    vi.useFakeTimers();
    escribir('pro');
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
    await estabilizar();

    const opcion = opciones().find((o) => o.textContent?.trim() === 'Producto dos');
    expect(opcion).toBeTruthy();
    opcion?.click();
    await estabilizar();

    expect(emitidos).toEqual([2]);
    expect(entrada().value).toBe('Producto dos');
  });

  it('con valorInicial muestra el nombre de la entidad en el input', async () => {
    fixture.componentRef.setInput('valorInicial', ENTIDAD.id);
    await estabilizar();

    expect(entrada().value).toBe('Producto uno');
  });

  it('con buscadorHijos y una entidad elegida, muestra el select de hijos con su label', async () => {
    fixture.componentRef.setInput('buscadorHijos', buscadorHijos as unknown as BuscadorDeHijos);
    fixture.componentRef.setInput('labelHijos', 'Variante');
    fixture.componentRef.setInput('valorInicial', ENTIDAD.id);
    await estabilizar();

    const labels = [...raiz().querySelectorAll('label[for]')];
    const labelHijo = labels.find((l) => l.textContent?.trim() === 'Variante');
    const controlHijo = document.getElementById(labelHijo?.getAttribute('for') ?? '');

    expect(controlHijo?.matches('input, select, [role="combobox"]')).toBe(true);
  });

  it('elegir un hijo emite su id', async () => {
    fixture.componentRef.setInput('buscadorHijos', buscadorHijos as unknown as BuscadorDeHijos);
    fixture.componentRef.setInput('labelHijos', 'Variante');
    fixture.componentRef.setInput('valorInicial', ENTIDAD.id);
    await estabilizar();
    const emitidos: Array<number | null> = [];
    component.hijoSeleccionado.subscribe((id) => emitidos.push(id));

    const labelHijo = [...raiz().querySelectorAll('label[for]')].find((l) => l.textContent?.trim() === 'Variante');
    document.getElementById(labelHijo?.getAttribute('for') ?? '')?.click();
    await estabilizar();
    opciones()
      .find((o) => o.textContent?.trim() === 'Grande / Azul')
      ?.click();
    await estabilizar();

    expect(emitidos).toEqual([11]);
  });

  it('si la entidad no tiene hijos, avisa en vez de mostrar un select vacio', async () => {
    buscadorHijos.hijosDe.mockReturnValue(of([]));
    fixture.componentRef.setInput('buscadorHijos', buscadorHijos as unknown as BuscadorDeHijos);
    fixture.componentRef.setInput('valorInicial', ENTIDAD.id);
    await estabilizar();

    expect(raiz().textContent).toContain('No hay elementos disponibles.');
  });

  it('disabled deshabilita el input de busqueda y el select de hijos', async () => {
    fixture.componentRef.setInput('buscadorHijos', buscadorHijos as unknown as BuscadorDeHijos);
    fixture.componentRef.setInput('labelHijos', 'Variante');
    fixture.componentRef.setInput('valorInicial', ENTIDAD.id);
    fixture.componentRef.setInput('disabled', true);
    await estabilizar();

    const labelHijo = [...raiz().querySelectorAll('label[for]')].find((l) => l.textContent?.trim() === 'Variante');
    const controlHijo = document.getElementById(labelHijo?.getAttribute('for') ?? '');

    expect(entrada().disabled).toBe(true);
    expect((controlHijo as HTMLInputElement | null)?.disabled === true || controlHijo?.getAttribute('aria-disabled') === 'true').toBe(true);
  });
});
