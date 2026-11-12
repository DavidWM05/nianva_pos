import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { CotizacionesListComponent } from './pages/cotizaciones-list/cotizaciones-list.component';
import { CotizacionService } from './cotizacion.service';
import { ApartadosListComponent } from '../apartados/pages/apartados-list/apartados-list.component';
import { ApartadoService } from '../apartados/apartado.service';
import { DevolucionesListComponent } from '../devoluciones/pages/devoluciones-list/devoluciones-list.component';
import { DevolucionService } from '../devoluciones/devolucion.service';
vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); });
const casos = [
  { nombre: 'cotizaciones', componente: CotizacionesListComponent, servicio: CotizacionService, fila: { id: 1, numero_cotizacion: 'COT-1', total: '10.00', estado: 'pendiente' } },
  { nombre: 'apartados', componente: ApartadosListComponent, servicio: ApartadoService, fila: { id: 1, total: '10.00', total_abonado: '5.00', estado: 'activo' } },
  { nombre: 'devoluciones', componente: DevolucionesListComponent, servicio: DevolucionService, fila: { id: 1, diferencia: '-10.00', tipo: 'devolucion' } },
];
for (const caso of casos) describe('50f listado ' + caso.nombre, () => {
  async function montar(crear = true): Promise<ComponentFixture<object>> {
    await TestBed.configureTestingModule({ imports: [caso.componente], providers: [...proveedoresDePantalla(), { provide: caso.servicio, useValue: { listar: vi.fn().mockReturnValue(of({ data: [caso.fila], total: 100, permisos: { crear } })) } }] }).compileComponents();
    const fixture = TestBed.createComponent(caso.componente as Type<object>); fixture.detectChanges(); return fixture;
  }
  it('meta cambia de página aunque no cambie el total', async () => {
    const fixture = await montar(); const instancia = fixture.componentInstance;
    expect(Reflect.get(instancia, 'meta')().page).toBe(1);
    Reflect.get(instancia, 'onLazyLoad').call(instancia, { first: 25, rows: 25, sortField: null, sortOrder: null, filters: {} });
    fixture.detectChanges(); expect(Reflect.get(instancia, 'meta')().page).toBe(2); expect(Reflect.get(instancia, 'meta')().total).toBe(100);
  });
  it('sin permiso crear no aparece su botón', async () => {
    const fixture = await montar(false); const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelector('ui-btn-crear, a[href$="/nuevo"], a[href$="/nueva"], a[href$="/crear"]')).toBeNull();
  });
  it('presenta un solo h1 del encabezado compartido', async () => {
    const fixture = await montar(); const elemento: HTMLElement = fixture.nativeElement;
    expect(elemento.querySelectorAll('ui-page-header h1')).toHaveLength(1);
    expect(elemento.querySelectorAll('h1')).toHaveLength(1);
  });
});
