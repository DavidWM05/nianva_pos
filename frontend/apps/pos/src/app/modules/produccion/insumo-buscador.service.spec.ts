import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { InsumoService, InsumosPagina } from './insumo.service';
import { Insumo } from './insumo.types';
import { InsumoBuscadorService } from './insumo-buscador.service';

describe('InsumoBuscadorService', () => {
  const insumo: Insumo = { id: 3, nombre: 'Harina', sku: null, unidad_medida_id: 1, costo: '10.5000', stock_minimo: '5.00', activo: true };

  function paginaCon(data: Insumo[]): InsumosPagina {
    return { data, total: data.length, permisos: { crear: true } };
  }

  function crearServicio(insumoService: Partial<InsumoService>): InsumoBuscadorService {
    TestBed.configureTestingModule({
      providers: [{ provide: InsumoService, useValue: insumoService }],
    });

    return TestBed.inject(InsumoBuscadorService);
  }

  it('buscar() adapta InsumoService.listar() al contrato BuscadorEntidad', async () => {
    const listar = vi.fn().mockReturnValue(of(paginaCon([insumo])));
    const servicio = crearServicio({ listar });

    const resultado = await servicio.buscar('Harina').toPromise();

    expect(listar).toHaveBeenCalledWith(expect.objectContaining({ first: 0 }), { nombre: 'Harina' });
    expect(resultado).toEqual([insumo]);
  });

  it('obtener() encuentra el insumo por id dentro de los primeros 100', async () => {
    const listar = vi.fn().mockReturnValue(of(paginaCon([insumo])));
    const servicio = crearServicio({ listar });

    const resultado = await servicio.obtener(3).toPromise();

    expect(resultado).toEqual(insumo);
  });
});
