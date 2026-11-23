import { TestBed } from '@angular/core/testing';
import { REGISTRO_NAVEGACION } from '@nianva/ui-layout';
import { describe, expect, it } from 'vitest';

import { ReportComponent } from './report.component';

describe('Estados de la plantilla de reporte', () => {
  it('muestra el estado vacío y oculta Exportar si no se concede el permiso', () => {
    TestBed.configureTestingModule({
      providers: [{
        provide: REGISTRO_NAVEGACION,
        useValue: [{ clave: 'reporte-demo', ruta: 'demo', nombre: 'Reporte', icono: 'pi pi-chart-line' }],
      }],
    });
    const fixture = TestBed.createComponent(ReportComponent);
    fixture.componentRef.setInput('clave', 'reporte-demo');
    fixture.componentRef.setInput('estado', 'vacio');
    fixture.componentRef.setInput('puedeExportar', false);
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;

    expect(vista.querySelector('ui-empty')?.textContent).toContain('No hay resultados');
    expect(vista.querySelector('ui-btn-exportar')).toBeNull();
  });
});
