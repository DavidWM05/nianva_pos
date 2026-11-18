import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { PresentacionesComponent } from './presentaciones/presentaciones.component';
import { PresentacionService } from '@nianva/domain-inventario';
describe('Presentaciones de variante', () => {
  async function preparar(soloLectura = false) {
    const crear = vi.fn(() => of({ id:1 }));
    await TestBed.configureTestingModule({ imports:[PresentacionesComponent], providers:[...proveedoresDePantalla(),{provide:PresentacionService,useValue:{listar:()=>of([]),crear}}] }).compileComponents();
    const fixture=TestBed.createComponent(PresentacionesComponent);fixture.componentRef.setInput('varianteId',5);fixture.componentRef.setInput('soloLectura',soloLectura);fixture.detectChanges();return {fixture,crear};
  }
  it('valida el nombre y factor y envía precio opcional sin calcularlo en el cliente',async()=>{ const {fixture,crear}=await preparar();const c=fixture.componentInstance; c.guardar();expect(crear).not.toHaveBeenCalled();c.form.setValue({nombre:'Caja',factor:6,codigo_barras:'CAJA-6',precio_venta:50});c.guardar();expect(crear).toHaveBeenCalledWith(5,{nombre:'Caja',factor:6,codigo_barras:'CAJA-6',precio_venta:50}); });
  it('en consulta deshabilita la edición y no envía cambios',async()=>{const {fixture,crear}=await preparar(true);expect(fixture.componentInstance.form.disabled).toBe(true);fixture.componentInstance.guardar();expect(crear).not.toHaveBeenCalled();});
});
