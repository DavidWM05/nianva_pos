import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ulidDePrueba } from '../../testing/ulid-de-prueba';
import { DevolucionFormComponent } from './pages/devolucion-form/devolucion-form.component';
import { type DevolucionFormPayload, DevolucionService } from '@nianva/domain-devoluciones';
import { MetodoPagoService, VentaService } from '@nianva/domain-tpv';
import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
describe('Devolución de presentaciones',()=>{it('envía la línea original y muestra el stock en unidades base',async()=>{
 const venta={id:ulidDePrueba(1),es_venta_sombra:false,detalles:[{id:ulidDePrueba(10),variante_id:5,cantidad:'1.000',precio_unitario:'100.00',variante:null},{id:ulidDePrueba(11),variante_id:5,cantidad:'2.000',precio_unitario:'50.00',presentacion_id:9,presentacion_nombre:'Caja',factor:'6.000',variante:null}]};
 const registrar=vi.fn((payload:DevolucionFormPayload)=>{void payload;return of({devolucion:{id:7},notaCredito:null});});const buscador={buscar:()=>of([]),obtener:()=>of({id:1,nombre:'Entidad'}),hijosDe:()=>of([])};
 await TestBed.configureTestingModule({imports:[DevolucionFormComponent],providers:[...proveedoresDePantalla(),{provide:VentaService,useValue:{obtener:()=>of(venta),buscarPorFolio:()=>of(ulidDePrueba(1))}},{provide:DevolucionService,useValue:{registrar}},{provide:MetodoPagoService,useValue:{listar:()=>of([])}},{provide:BUSCADOR_PRODUCTO,useValue:buscador},{provide:BUSCADOR_VARIANTE_DE_PRODUCTO,useValue:buscador}]}).compileComponents();
 vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
 const f=TestBed.createComponent(DevolucionFormComponent);f.detectChanges();f.componentInstance['folioBusqueda'].set('V-1-1');f.componentInstance.buscarVenta();f.componentInstance.actualizarCantidadDevuelta(1,1);expect(f.componentInstance['unidadesRegresanAStock']()).toBe(6);f.componentInstance.onPagosCambio({pagos:[{metodo_pago_id:1,monto:50}],cuadra:true,suma:50});f.componentInstance.registrarDevolucion();expect(registrar).toHaveBeenCalledWith(expect.objectContaining({items_devueltos:[{variante_id:5,venta_detalle_id:ulidDePrueba(11),cantidad:1,va_a_merma:false}]}), expect.any(String), undefined);
});});
