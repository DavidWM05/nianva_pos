import { TestBed } from '@angular/core/testing';
import { InicioService, type InicioResumenMetricas } from '@nianva/domain-nucleo';
import { CajaService } from '@nianva/domain-tpv';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { InicioComponent } from './inicio.component';

function resumen(cantidad: number): InicioResumenMetricas {
  return {
    fecha_corte: '2026-11-23',
    zona_horaria: 'America/Mexico_City',
    sucursal_id: 1,
    ventas_hoy: { cantidad, total: '1250.50' },
    gastos_hoy: '32.10',
    ventas_netas_comerciales_mes: '3040.60',
    rentabilidad_mes: null,
    productos_activos: 14,
    alertas_stock_bajo: 3,
    ventas_ultimos_siete_dias: Array.from({ length: 7 }, (_, indice) => ({
      fecha: '2026-11-' + (17 + indice), vendido: indice === 6 ? '1250.50' : '0.00',
      ventas_netas_comerciales: indice === 6 ? '1200.50' : '0.00',
    })),
    ranking_variantes: [{
      unidad: { id: 2, nombre: 'Kilogramo' },
      variantes: [{ variante_id: 21, producto_nombre: 'Frijol negro', cantidad_base: '14.750' }],
    }],
    apartados_por_vencer: [],
  };
}

function render(cantidad: number): HTMLElement {
  TestBed.configureTestingModule({
    imports: [InicioComponent],
    providers: [
      ...proveedoresDePantalla(),
      { provide: InicioService, useValue: { resumen: () => of(resumen(cantidad)) } },
      { provide: CajaService, useValue: { actual: () => of({ sesion: null, resumen: null }) } },
    ],
  });

  const fixture = TestBed.createComponent(InicioComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Métricas de Inicio', () => {
  it('muestra las seis tarjetas, siete fechas y el ranking separado por unidad', () => {
    const vista = render(5);
    const tarjetas = vista.querySelectorAll('ui-kpi');
    expect(Array.from(tarjetas).slice(0, 6).map((tarjeta) => tarjeta.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Ventas de hoy $1,250.50', 'Tickets de hoy 5 ventas', 'Gastos de hoy $32.10',
      'Ingresos del mes $3,040.60', 'Catálogo activo 14', 'Stock bajo 3',
    ]);
    expect(vista.querySelectorAll('ui-grafica-serie time')).toHaveLength(7);
    expect(vista.querySelector('ui-grafica-serie')?.textContent).toContain('$1,250.50');
    expect(vista.textContent).toContain('Frijol negro');
    expect(vista.textContent).toContain('Kilogramo');
    expect(vista.textContent).toContain('14.75');
  });

  it.each([[1, '1 venta'], [0, '0 ventas']])('muestra la unidad correcta con %i tickets', (cantidad, texto) => {
    const ticket = render(cantidad).querySelectorAll('ui-kpi')[1];
    expect(ticket.textContent?.replace(/\s+/g, ' ').trim()).toBe('Tickets de hoy ' + texto);
  });
});
