import { ChangeDetectionStrategy, Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ColumnaListado, TablaComponent } from '@nianva/ui-data';
import { aplicarErroresServidor, BtnEnviarComponent, CampoComponent, InputCantidadComponent, InputDineroComponent } from '@nianva/ui-forms';
import { FormActionsComponent, PageComponent } from '@nianva/ui-layout';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { aCentavos, cantidadANumero } from '@nianva/ui-format';
import { leerErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { finalize } from 'rxjs';
import { PresentacionService, Presentacion } from '../presentacion.service';
@Component({selector:'nucleo-presentaciones',standalone:true,changeDetection:ChangeDetectionStrategy.OnPush,imports:[TablaComponent,ReactiveFormsModule,CampoComponent,InputCantidadComponent,InputDineroComponent,BtnEnviarComponent,FormActionsComponent,PageComponent],templateUrl:'./presentaciones.component.html'})
export class PresentacionesComponent implements OnChanges {
 @Input({required:true}) varianteId!:number;
 @Input() soloLectura=false;
 private readonly servicio=inject(PresentacionService);private readonly confirmar=inject(ConfirmDialogService);private readonly toast=inject(ToastService);
 protected readonly filas=signal<Presentacion[]>([]);protected readonly estado=signal<'cargando'|'listo'|'error'>('cargando');protected readonly enviando=signal(false);protected readonly editando=signal<number|null>(null);
 readonly form=new FormGroup({nombre:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(120)]}),factor:new FormControl<number|null>(null,[Validators.required,Validators.min(0.001),Validators.max(99999999999.999),Validators.pattern(/^\d+(?:\.\d{1,3})?$/)]),codigo_barras:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(50)]}),precio_venta:new FormControl<number|null>(null,[Validators.min(0),Validators.max(9999999999.99)])});
 protected readonly columnas:ColumnaListado<Presentacion>[]=[{tipo:'principal',campo:'nombre',encabezado:'Presentación'},{tipo:'cantidad',campo:'factor',encabezado:'Unidades base'},{tipo:'dinero',campo:'precio_venta',encabezado:'Precio propio'},{tipo:'acciones',acciones:()=>this.soloLectura?[]:[{tipo:'editar'},{tipo:'eliminar'}]}];
 ngOnChanges():void {if(this.soloLectura)this.form.disable();else this.form.enable();this.cargar();}
 protected cargar():void {this.estado.set('cargando');this.servicio.listar(this.varianteId).subscribe({next:r=>{this.filas.set(r);this.estado.set('listo');},error:()=>this.estado.set('error')});}
 guardar():void {if(this.soloLectura||this.enviando()||this.form.invalid){this.form.markAllAsTouched();return;}const v=this.form.getRawValue();if(v.factor===null)return;const datos={nombre:v.nombre,factor:v.factor,codigo_barras:v.codigo_barras.trim()||null,precio_venta:v.precio_venta};this.enviando.set(true);const id=this.editando();const r=id===null?this.servicio.crear(this.varianteId,datos):this.servicio.actualizar(this.varianteId,id,datos);r.pipe(finalize(()=>this.enviando.set(false))).subscribe({next:()=>{this.cancelar();this.cargar();this.toast.success('Presentación guardada.');},error:e=>{aplicarErroresServidor(this.form,e);if(!leerErrorNegocio(e))this.toast.error(mensajeError(e,'No se pudo guardar la presentación.'));}});}
 protected cancelar():void {this.editando.set(null);this.form.reset({nombre:'',factor:null,codigo_barras:'',precio_venta:null});}
 protected async accion(p:Presentacion,accion:string):Promise<void>{if(this.soloLectura)return;if(accion==='editar'){this.editando.set(p.id);this.form.setValue({nombre:p.nombre,factor:cantidadANumero(p.factor),codigo_barras:p.codigo_barras??'',precio_venta:p.precio_venta===null?null:aCentavos(p.precio_venta)/100});return;}if(!await this.confirmar.confirmarEliminacion({objeto:'presentación'}))return;this.servicio.eliminar(this.varianteId,p.id).subscribe({next:()=>this.cargar(),error:e=>{if(!leerErrorNegocio(e))this.toast.error(mensajeError(e,'No se pudo eliminar la presentación.'));}});}
}
