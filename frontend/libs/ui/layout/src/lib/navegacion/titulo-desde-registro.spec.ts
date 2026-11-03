import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { REGISTRO_NAVEGACION } from './registro-navegacion';
import { TituloDesdeRegistro } from './titulo-desde-registro';

@Component({ standalone: true, template: '' })
class VaciaComponent {}

describe('TituloDesdeRegistro', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'inventario',
            children: [
              { path: 'productos', component: VaciaComponent },
              { path: 'productos/:id', title: 'Núcleo · Detalle de producto', component: VaciaComponent },
            ],
          },
          { path: 'sin-titulo', component: VaciaComponent },
        ]),
        { provide: TitleStrategy, useClass: TituloDesdeRegistro },
        {
          provide: REGISTRO_NAVEGACION,
          useValue: [{ clave: 'inventario', ruta: 'inventario/productos', nombre: 'Productos', icono: 'pi pi-box' }],
        },
      ],
    });
  });

  async function navegar(url: string): Promise<string> {
    await TestBed.inject(Router).navigateByUrl(url);

    return TestBed.inject(Title).getTitle();
  }

  it('una pantalla del registro toma su nombre de ahi', async () => {
    expect(await navegar('/inventario/productos')).toBe('Núcleo · Productos');
  });

  it('una pantalla fuera del registro usa el title de su ruta', async () => {
    expect(await navegar('/inventario/productos/7')).toBe('Núcleo · Detalle de producto');
  });

  it('sin entrada ni title queda la marca', async () => {
    expect(await navegar('/sin-titulo')).toBe('Núcleo');
  });
});
