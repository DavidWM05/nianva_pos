import { Type } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CATEGORIA, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ClienteService } from '../crm/cliente.service';
import { ClienteCrearComponent } from '../crm/pages/cliente-crear/cliente-crear.component';
import { CuponService } from './cupon.service';
import { CuponCrearComponent } from './pages/cupon-crear/cupon-crear.component';
import { CuponDetalleComponent } from './pages/cupon-detalle/cupon-detalle.component';
import { PreciosComponent } from './pages/precios/precios.component';
import { ReglaPrecioCrearComponent } from './pages/regla-precio-crear/regla-precio-crear.component';
import { ReglaPrecioDetalleComponent } from './pages/regla-precio-detalle/regla-precio-detalle.component';
import { ReglaPrecioService } from './regla-precio.service';

vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); });

const paginas: Type<object>[] = [ClienteCrearComponent, CuponCrearComponent, CuponDetalleComponent, PreciosComponent, ReglaPrecioCrearComponent, ReglaPrecioDetalleComponent];
for (const componente of paginas) {
  describe(componente.name, () => {
    it('usa el encabezado del registro y conserva un solo h1', async () => {
      const buscador = { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() };
      await TestBed.configureTestingModule({
        imports: [componente],
        deferBlockBehavior: DeferBlockBehavior.Manual,
        providers: [
          ...proveedoresDePantalla(),
          { provide: ClienteService, useValue: {} },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
          { provide: BUSCADOR_CATEGORIA, useValue: buscador },
          { provide: BUSCADOR_PRODUCTO, useValue: buscador },
          { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
          { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
          { provide: CuponService, useValue: { listar: vi.fn().mockReturnValue(of({ data: [], total: 0, permisos: {} })), obtener: vi.fn().mockReturnValue(of({ cupon: { id: 1, codigo: 'PRUEBA', nombre: 'Prueba', tipo: 'porcentaje' }, permisos: { editar: false } })) } },
          { provide: ReglaPrecioService, useValue: { listar: vi.fn().mockReturnValue(of({ data: [], total: 0, permisos: {} })), obtener: vi.fn().mockReturnValue(of({ regla: { id: 1, nombre: 'Prueba', tipo: 'porcentaje', aplica_a: 'todo' }, permisos: { editar: false } })) } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(componente);
      fixture.detectChanges();
      const elemento: HTMLElement = fixture.nativeElement;
      expect(elemento.querySelector('ui-page-header')).not.toBeNull();
      expect(elemento.querySelectorAll('h1')).toHaveLength(1);
    });
  });
}
