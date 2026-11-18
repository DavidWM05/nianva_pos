import { SelectorPresentacionComponent } from './selector-presentacion/selector-presentacion.component';
import { BUSCADOR_PRESENTACION } from '../../core/buscadores-entidad.tokens';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { LineasProductoComponent } from './lineas-producto/lineas-producto.component';
import { VentaService } from '@nianva/domain-tpv';
import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
describe('Captura de presentaciones',()=>{
  async function preparar(stock='20.000') {const cotizar=vi.fn(()=>of({items:[{variante_id:5,regla_precio_id:null,cantidad:'1.000',precio_unitario:'50.00',descuento_aplicado:'0.00',subtotal:'50.00'}],subtotal:'50.00'}));const resolverCodigo=vi.fn(()=>of({variante_id:5,producto_nombre:'Martillo',presentacion_id:9,presentacion_nombre:'Caja',factor:'6.000',stock_actual:stock}));const buscador={buscar:()=>of([]),obtener:()=>of({id:1,nombre:'Martillo'}),hijosDe:()=>of([])};
  await TestBed.configureTestingModule({imports:[LineasProductoComponent],providers:[...proveedoresDePantalla(),{provide:VentaService,useValue:{cotizar,resolverCodigo}},{provide:BUSCADOR_PRODUCTO,useValue:buscador},{provide:BUSCADOR_VARIANTE_DE_PRODUCTO,useValue:buscador}]}).compileComponents();const fixture=TestBed.createComponent(LineasProductoComponent);fixture.componentRef.setInput('presentacionesHabilitadas',true);fixture.detectChanges();return {fixture,cotizar,resolverCodigo};}
  it('escanea y cotiza el id de presentación y muestra su nombre',async()=>{const {fixture,cotizar,resolverCodigo}=await preparar();fixture.componentInstance.escanearCodigo('CAJA-6');fixture.detectChanges();expect(resolverCodigo).toHaveBeenCalledWith('CAJA-6');expect(cotizar).toHaveBeenCalledWith([{variante_id:5,presentacion_id:9,cantidad:1}]);expect(fixture.nativeElement.textContent).toContain('Caja');expect(fixture.componentInstance['subtotal']()).toBe(50);});
  it('no agrega una caja cuando el stock base no cubre su factor',async()=>{const {fixture,cotizar}=await preparar('3.000');fixture.componentInstance.escanearCodigo('CAJA-6');expect(cotizar).not.toHaveBeenCalled();expect(fixture.componentInstance['lineas']()).toHaveLength(0);});
});

describe('Selector de presentación',()=>{it('cambiar variante limpia la presentación previa',async()=>{await TestBed.configureTestingModule({imports:[SelectorPresentacionComponent],providers:[...proveedoresDePantalla(),{provide:BUSCADOR_PRESENTACION,useValue:{hijosDe:()=>of([{id:9,nombre:'Caja',factor:'6.000'}])}}]}).compileComponents();const f=TestBed.createComponent(SelectorPresentacionComponent);f.componentRef.setInput('varianteId',5);f.detectChanges();f.componentInstance['elegir'](9);expect(f.componentInstance['actual']()).toBe(9);const emitir=vi.spyOn(f.componentInstance.seleccionado,'emit');f.componentRef.setInput('varianteId',6);f.detectChanges();expect(f.componentInstance['actual']()).toBeNull();expect(emitir).toHaveBeenCalledWith(null);});});
