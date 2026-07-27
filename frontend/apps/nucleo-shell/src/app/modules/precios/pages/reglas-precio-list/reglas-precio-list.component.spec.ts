import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  BUSCADOR_CATEGORIA,
  BUSCADOR_PRODUCTO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
} from '../../../../core/buscadores-entidad.tokens';
import { ReglaPrecioService } from '../../regla-precio.service';
import { ReglaPrecio, ReglasPrecioPagina } from '../../regla-precio.types';
import { ReglasPrecioListComponent } from './reglas-precio-list.component';

describe('ReglasPrecioListComponent', () => {
  let fixture: ComponentFixture<ReglasPrecioListComponent>;
  let reglaPrecioService: { listar: ReturnType<typeof vi.fn> };

  const reglas: ReglaPrecio[] = [
    {
      id: 1,
      nombre: 'Descuento playeras',
      tipo: 'porcentaje',
      valor: '15.00',
      cantidad_compra: null,
      cantidad_paga: null,
      precio_bundle: null,
      aplica_a: 'categoria',
      categoria: { id: 3, nombre: 'Playeras' },
      producto: null,
      variante: null,
      fecha_inicio: null,
      fecha_fin: null,
      activo: true,
    },
    {
      id: 2,
      nombre: 'Combo gorras',
      tipo: 'nxm',
      valor: null,
      cantidad_compra: 3,
      cantidad_paga: 2,
      precio_bundle: null,
      aplica_a: 'variante',
      categoria: null,
      producto: null,
      variante: { id: 9, talla: 'Unica', color: 'Negro', producto_nombre: 'Gorra' },
      fecha_inicio: null,
      fecha_fin: null,
      activo: true,
    },
  ];

  function paginaCon(permisos: ReglasPrecioPagina['permisos']): ReglasPrecioPagina {
    return { data: reglas, total: reglas.length, permisos };
  }

  async function crearComponente(permisos: ReglasPrecioPagina['permisos']): Promise<void> {
    reglaPrecioService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [ReglasPrecioListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: ReglaPrecioService, useValue: reglaPrecioService },
        { provide: BUSCADOR_CATEGORIA, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReglasPrecioListComponent);
    fixture.detectChanges();
  }

  it('renderiza cada regla con la entidad especifica de "aplica a", no solo el nivel', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Descuento playeras');
    expect(texto).toContain('Playeras'); // categoria especifica, no solo "categoria"
    expect(texto).toContain('Combo gorras');
    expect(texto).toContain('Gorra (Unica / Negro)'); // producto + variante especifica
  });

  it('oculta "Nueva regla" sin el permiso reglas_precio.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nueva regla');
  });

  it('"Nueva regla" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/precios/reglas/nuevo"]');
    expect(enlace).toBeTruthy();
  });

  it('etiquetaAplicaA devuelve "Todo el catálogo" cuando aplica_a es todo', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const etiqueta = fixture.componentInstance['etiquetaAplicaA']({
      ...reglas[0],
      aplica_a: 'todo',
    });

    expect(etiqueta).toBe('Todo el catálogo');
  });
});
