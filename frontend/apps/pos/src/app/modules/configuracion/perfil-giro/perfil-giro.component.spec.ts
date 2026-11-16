import { TestBed } from '@angular/core/testing';
import { PerfilGiroService } from '@nianva/domain-configuracion';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { Subject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { proveedoresDePantalla } from '../../../testing/proveedores-pantalla';
import { PerfilGiroComponent } from './perfil-giro.component';

/** ARQ-07a: el giro se elige en Configuración y solo siembra lo que falta. */
const perfiles = [
  { clave: 'generico', nombre: 'Genérico', atributos: [], unidades: ['pza'], categorias: [], modulos_sugeridos: [] },
  {
    clave: 'ropa-calzado',
    nombre: 'Ropa y calzado',
    atributos: [{ nombre: 'Talla', valores: ['CH', 'M', 'G'] }],
    unidades: ['pza', 'par'],
    categorias: ['Ropa', 'Calzado'],
    modulos_sugeridos: ['apartados'],
  },
];

async function crear(opciones: { confirmar?: boolean; catalogo?: unknown } = {}) {
  const aplicar = vi.fn(() =>
    of({
      data: perfiles[1],
      meta: { actual: 'ropa-calzado', creados: { atributos: 1, valores: 3, categorias: 2, unidades: 1 } },
    }),
  );
  const confirm = vi.fn(() => Promise.resolve(opciones.confirmar ?? true));
  const toast = { success: vi.fn(), error: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [PerfilGiroComponent],
    providers: [
      ...proveedoresDePantalla(),
      {
        provide: PerfilGiroService,
        useValue: { catalogo: () => opciones.catalogo ?? of({ data: perfiles, meta: { actual: 'generico' } }), aplicar },
      },
      { provide: ConfirmDialogService, useValue: { confirm } },
      { provide: ToastService, useValue: toast },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PerfilGiroComponent);
  fixture.detectChanges();
  const componente = fixture.componentInstance as unknown as {
    elegido: { set(v: string): void };
    aplicar(): Promise<void>;
  };

  return { fixture, componente, aplicar, confirm, toast, el: fixture.nativeElement as HTMLElement };
}

describe('PerfilGiroComponent', () => {
  it('muestra el perfil actual y lo que siembra el perfil elegido', async () => {
    const { fixture, componente, el } = await crear();

    expect(el.textContent).toContain('Perfil actual: Genérico');
    componente.elegido.set('ropa-calzado');
    fixture.detectChanges();

    expect(el.textContent).toContain('Talla: CH, M, G');
    expect(el.textContent).toContain('Ropa, Calzado');
    expect(el.textContent).toContain('pza, par');
  });

  it('aplica el perfil tras confirmar y avisa cuánto se agregó', async () => {
    const { fixture, componente, aplicar, toast, el } = await crear();

    componente.elegido.set('ropa-calzado');
    await componente.aplicar();
    fixture.detectChanges();

    expect(aplicar).toHaveBeenCalledWith('ropa-calzado');
    expect(toast.success).toHaveBeenCalledWith(
      'Perfil aplicado: 1 atributos, 3 valores, 2 categorías y 1 unidades nuevas.',
    );
    expect(el.textContent).toContain('Perfil actual: Ropa y calzado');
  });

  it('si no se confirma, no aplica nada', async () => {
    const { componente, aplicar } = await crear({ confirmar: false });

    componente.elegido.set('ropa-calzado');
    await componente.aplicar();

    expect(aplicar).not.toHaveBeenCalled();
  });

  it('mientras carga muestra un skeleton, no un texto suelto', async () => {
    const { el } = await crear({ catalogo: new Subject() });

    expect(el.querySelector('ui-skeleton')).not.toBeNull();
  });
});
