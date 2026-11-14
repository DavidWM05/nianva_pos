import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SucursalService } from '../../../administracion/sucursal.service';
import { VentaService } from '../../../tpv/venta.service';
import { ReporteVentas } from '../../../tpv/venta.types';
import { ReporteVentasComponent } from './reporte-ventas.component';

// UI-05: importes con el pipe dinero y cantidades con cantidad (formato regional es-MX del spec).
describe('ReporteVentasComponent formato por pipe', () => {
  it('muestra importes con dinero y la cantidad vendida con cantidad', async () => {
    const reporte: ReporteVentas = {
      total_ventas: 125000,
      numero_ventas: 340,
      ticket_promedio: 367.6,
      por_sucursal: [{ sucursal_id: 1, sucursal_nombre: 'Centro', total: 80000.5, numero_ventas: 210 }],
      por_metodo_pago: [{ metodo_pago_id: 1, metodo_pago_nombre: 'Efectivo', total: 70000 }],
      top_productos: [{ variante_id: 12, producto_nombre: 'Playera', talla: 'M', color: 'Negro', cantidad_vendida: 1250.5, total_vendido: 6750 }],
    };

    await TestBed.configureTestingModule({
      imports: [ReporteVentasComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: VentaService, useValue: { reporte: vi.fn().mockReturnValue(of(reporte)) } },
        { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReporteVentasComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const esperado of ['$125,000.00', '$367.60', '$80,000.50', '$70,000.00', '1,250.5', '$6,750.00']) {
      expect(texto, esperado).toContain(esperado);
    }
  });
});
