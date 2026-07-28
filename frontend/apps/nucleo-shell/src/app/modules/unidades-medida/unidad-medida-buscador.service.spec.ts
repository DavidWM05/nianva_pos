import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { UnidadMedida } from './unidad-medida.types';
import { UnidadMedidaService } from './unidad-medida.service';
import { UnidadMedidaBuscadorService } from './unidad-medida-buscador.service';

describe('UnidadMedidaBuscadorService', () => {
  const unidades: UnidadMedida[] = [
    { id: 1, nombre: 'Kilogramo', abreviatura: 'kg', tipo: 'fraccionario', activo: true, created_at: '', updated_at: '' },
    { id: 2, nombre: 'Litro', abreviatura: 'L', tipo: 'fraccionario', activo: true, created_at: '', updated_at: '' },
  ];

  function crearServicio(unidadMedidaService: Partial<UnidadMedidaService>): UnidadMedidaBuscadorService {
    TestBed.configureTestingModule({
      providers: [{ provide: UnidadMedidaService, useValue: unidadMedidaService }],
    });

    return TestBed.inject(UnidadMedidaBuscadorService);
  }

  it('buscar() filtra client-side sobre la lista completa (el backend no pagina ni busca por texto)', async () => {
    const servicio = crearServicio({ listar: vi.fn().mockReturnValue(of(unidades)) });

    const resultado = await servicio.buscar('kilo').toPromise();

    expect(resultado).toEqual([unidades[0]]);
  });

  it('buscar() con texto vacio devuelve la lista completa', async () => {
    const servicio = crearServicio({ listar: vi.fn().mockReturnValue(of(unidades)) });

    const resultado = await servicio.buscar('').toPromise();

    expect(resultado).toEqual(unidades);
  });

  it('obtener() encuentra la unidad por id dentro de la lista completa', async () => {
    const servicio = crearServicio({ listar: vi.fn().mockReturnValue(of(unidades)) });

    const resultado = await servicio.obtener(2).toPromise();

    expect(resultado).toEqual(unidades[1]);
  });
});
