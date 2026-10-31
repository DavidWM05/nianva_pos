import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { RecetaService, RecetasPagina } from './receta.service';
import { Receta } from './receta.types';
import { RecetaBuscadorService } from './receta-buscador.service';

describe('RecetaBuscadorService', () => {
  const receta: Receta = { id: 10, variante_id: 8, nombre: 'Pan de caja', descripcion: null, instrucciones: null, rendimiento: '10.00' };

  function paginaCon(data: Receta[]): RecetasPagina {
    return { data, total: data.length, permisos: { crear: true } };
  }

  function crearServicio(recetaService: Partial<RecetaService>): RecetaBuscadorService {
    TestBed.configureTestingModule({
      providers: [{ provide: RecetaService, useValue: recetaService }],
    });

    return TestBed.inject(RecetaBuscadorService);
  }

  it('buscar() filtra client-side por nombre', async () => {
    const listar = vi.fn().mockReturnValue(of(paginaCon([receta])));
    const servicio = crearServicio({ listar });

    const resultado = await servicio.buscar('pan').toPromise();

    expect(listar).toHaveBeenCalledWith(expect.objectContaining({ first: 0, rows: 100 }));
    expect(resultado).toEqual([receta]);
  });

  it('buscar() sin texto devuelve todas las recetas de la pagina', async () => {
    const listar = vi.fn().mockReturnValue(of(paginaCon([receta])));
    const servicio = crearServicio({ listar });

    const resultado = await servicio.buscar('').toPromise();

    expect(resultado).toEqual([receta]);
  });

  it('obtener() encuentra la receta por id dentro de los primeros 100', async () => {
    const listar = vi.fn().mockReturnValue(of(paginaCon([receta])));
    const servicio = crearServicio({ listar });

    const resultado = await servicio.obtener(10).toPromise();

    expect(resultado).toEqual(receta);
  });
});
