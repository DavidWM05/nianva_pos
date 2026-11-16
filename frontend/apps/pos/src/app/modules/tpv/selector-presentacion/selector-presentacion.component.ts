import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { BuscadorEntidad, EntidadSelectorComponent } from '@nianva/ui-shared';
import { MatButton } from '@angular/material/button';
import { map } from 'rxjs';
import { BUSCADOR_PRESENTACION, PresentacionBuscable } from '../../../core/buscadores-entidad.tokens';
@Component({selector:'nucleo-selector-presentacion',standalone:true,imports:[EntidadSelectorComponent,MatButton],changeDetection:ChangeDetectionStrategy.OnPush,template:'<nucleo-entidad-selector [buscador]="buscador" label="Presentación" placeholder="Vacío: unidad base" [valorInicial]="actual()" (seleccionado)="elegir($event)" /><button matButton="text" type="button" (click)="elegir(null)">Usar unidad base</button>'})
export class SelectorPresentacionComponent implements OnChanges {
 ngOnChanges():void {this.actual.set(null);this.seleccionado.emit(null);}
 @Input({required:true}) varianteId!:number;
 @Output() seleccionado=new EventEmitter<PresentacionBuscable|null>();
 private readonly origen=inject(BUSCADOR_PRESENTACION);
 protected readonly actual=signal<number|null>(null);
 protected readonly buscador:BuscadorEntidad<PresentacionBuscable>={buscar: texto=>this.origen.hijosDe(this.varianteId).pipe(map(filas=>filas.filter(f=>f.nombre.toLocaleLowerCase().includes(texto.toLocaleLowerCase())))),obtener: id=>this.origen.hijosDe(this.varianteId).pipe(map(filas=>{const fila=filas.find(f=>f.id===id);if(!fila)throw new Error('Presentación no disponible.');return fila;}))};
 protected elegir(id:number|null):void {this.actual.set(id);if(id===null){this.seleccionado.emit(null);return;}const variante=this.varianteId;this.buscador.obtener(id).subscribe({next:fila=>{if(this.varianteId===variante&&this.actual()===id)this.seleccionado.emit(fila);},error:()=>{this.actual.set(null);this.seleccionado.emit(null);}});}
}
