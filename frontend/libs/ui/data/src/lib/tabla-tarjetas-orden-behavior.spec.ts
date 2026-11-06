import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PantallaService } from '@nianva/ui-layout';
import { beforeEach, describe, expect, it } from 'vitest';

import { CambioListado, ColumnaListado, MetaListado } from './listado.types';
import { TablaComponent } from './tabla.component';

interface Fila {
  nombre: string;
  total: number;
}

const columnas: ColumnaListado<Fila>[] = [
  { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true },
  { tipo: 'dinero', campo: 'total', encabezado: 'Total', ordenable: true },
];

const filas: Fila[] = [{ nombre: 'Playera', total: 1250.5 }];

describe('TablaComponent en tarjetas: orden', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaComponent],
      providers: [
        provideAnimationsAsync(),         { provide: PantallaService, useValue: { angosta: signal(true).asReadonly() } },
      ],
    }).compileComponents();
  });

  function render(meta: MetaListado) {
    const fixture = TestBed.createComponent(TablaComponent<Fila>);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('meta', meta);
    fixture.detectChanges();

    return fixture;
  }

  const enPagina3: MetaListado = { total: 80, page: 3, rows: 25, filtros_aplicados: {}, permisos: {} };

  it('cambiar el orden vuelve a la primera pagina, igual que la tabla', () => {
    const fixture = render(enPagina3);
    const cambios: CambioListado[] = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));
    const selector = fixture.nativeElement.querySelector('.ui-tabla__orden select') as HTMLSelectElement;

    selector.value = 'total';
    selector.dispatchEvent(new Event('change'));
    (fixture.nativeElement.querySelector('.ui-tabla__orden-direccion') as HTMLButtonElement).click();

    expect(cambios.map((cambio) => cambio.page)).toEqual([1, 1]);
    expect(cambios.at(-1)).toMatchObject({ sortField: 'total', sortOrder: 'desc' });
  });

  it('dos tablas en la misma pantalla no repiten el id del selector de orden', () => {
    const primera = render(enPagina3).nativeElement as HTMLElement;
    const segunda = render(enPagina3).nativeElement as HTMLElement;
    const idPrimera = primera.querySelector('.ui-tabla__orden select')?.id;
    const idSegunda = segunda.querySelector('.ui-tabla__orden select')?.id;

    expect(idPrimera).toBeTruthy();
    expect(idPrimera).not.toBe(idSegunda);
    expect(segunda.querySelector('.ui-tabla__orden label')?.getAttribute('for')).toBe(idSegunda);
  });
});
