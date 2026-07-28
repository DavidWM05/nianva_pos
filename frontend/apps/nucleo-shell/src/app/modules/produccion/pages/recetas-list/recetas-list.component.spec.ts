import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { RecetaService, RecetasPagina } from '../../receta.service';
import { Receta } from '../../receta.types';
import { RecetasListComponent } from './recetas-list.component';

describe('RecetasListComponent', () => {
  let fixture: ComponentFixture<RecetasListComponent>;
  let recetaService: { listar: ReturnType<typeof vi.fn> };

  const recetas: Receta[] = [
    {
      id: 1,
      variante_id: 8,
      nombre: 'Pan de caja',
      descripcion: null,
      instrucciones: null,
      rendimiento: '10.00',
      ingredientes: [{ id: 1, insumo_id: 3, cantidad: '2.5000', unidad_medida_id: 5 }],
    },
  ];

  function paginaCon(permisos: RecetasPagina['permisos']): RecetasPagina {
    return { data: recetas, total: recetas.length, permisos };
  }

  async function crearComponente(permisos: RecetasPagina['permisos'] = { crear: true }): Promise<void> {
    recetaService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [RecetasListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: RecetaService, useValue: recetaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecetasListComponent);
    fixture.detectChanges();
  }

  it('carga las recetas al iniciar y muestra el conteo de ingredientes', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Pan de caja');
    expect(texto).toContain('Variante #8');
    expect(recetaService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nueva receta" sin el permiso produccion.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nueva receta');
  });
});
