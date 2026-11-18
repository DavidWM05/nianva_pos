import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { DevolucionFormComponent } from './pages/devolucion-form/devolucion-form.component';
import { type DevolucionFormPayload, DevolucionService } from '@nianva/domain-devoluciones';
import { MetodoPagoService, VentaService } from '@nianva/domain-tpv';
import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
describe('Reembolso de presentación fraccionaria',()=>{it('estima el subtotal guardado y no multiplica el precio mostrado redondeado',async()=>{
 const venta={id:1,es_venta_sombra:false,detalles:[{id:11,variante_id:5,cantidad:'3.000',precio_unitario:'0.51',subtotal:'1.52',presentacion_id:9,presentacion_nombre:'Media unidad',factor:'0.500',variante:null}]};
 const registrar=vi.fn((payload:DevolucionFormPayload)=>{void payload;return of({devolucion:{id:7},notaCredito:null});});const buscador={buscar:()=>of([]),obtener:()=>of({id:1,nombre:'Entidad'}),hijosDe:()=>of([])};
 await TestBed.configureTestingModule({imports:[DevolucionFormComponent],providers:[...proveedoresDePantalla(),{provide:VentaService,useValue:{obtener:()=>of(venta)}},{provide:DevolucionService,useValue:{registrar}},{provide:MetodoPagoService,useValue:{listar:()=>of([])}},{provide:BUSCADOR_PRODUCTO,useValue:buscador},{provide:BUSCADOR_VARIANTE_DE_PRODUCTO,useValue:buscador}]}).compileComponents();
 vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
 const f=TestBed.createComponent(DevolucionFormComponent);f.detectChanges();f.componentInstance['ventaIdBusqueda'].set(1);f.componentInstance.buscarVenta();f.componentInstance.actualizarCantidadDevuelta(0,3);expect(f.componentInstance['montoDevolucionEstimado']()).toBe(1.52);
});});
