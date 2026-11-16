import { Injectable, inject } from '@angular/core';
import { BuscadorDeHijos } from '@nianva/ui-shared';
import { map } from 'rxjs';
import type { PresentacionBuscable } from '../../core/buscadores-entidad.tokens';
import { PresentacionService } from './presentacion.service';
@Injectable({providedIn:'root'})
export class PresentacionBuscadorService extends BuscadorDeHijos<PresentacionBuscable> {
 private readonly servicio=inject(PresentacionService);
 hijosDe(id:number){return this.servicio.listar(id).pipe(map(filas=>filas.map(p=>({id:p.id,nombre:p.nombre,factor:p.factor}))));}
}
