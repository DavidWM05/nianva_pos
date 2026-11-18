import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { CuerpoDe, RespuestaDe, PresentacionResource } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { map } from 'rxjs';
export type Presentacion = PresentacionResource;
export type DatosPresentacion = CuerpoDe<'/producto-variantes/{variante}/presentaciones','post'>;
@Injectable({ providedIn:'root' })
export class PresentacionService {
 private readonly http=inject(HttpClient);
 listar(variante:number) {return this.http.get<RespuestaDe<'/producto-variantes/{variante}/presentaciones','get'>>(urlApi('/producto-variantes/'+variante+'/presentaciones')).pipe(map(r=>r.data));}
 crear(variante:number,datos:DatosPresentacion){return this.http.post<RespuestaDe<'/producto-variantes/{variante}/presentaciones','post'>>(urlApi('/producto-variantes/'+variante+'/presentaciones'),datos).pipe(map(r=>r.data));}
 actualizar(variante:number,id:number,datos:DatosPresentacion){return this.http.put<RespuestaDe<'/producto-variantes/{variante}/presentaciones/{presentacion}','put'>>(urlApi('/producto-variantes/'+variante+'/presentaciones/'+id),datos).pipe(map(r=>r.data));}
 eliminar(variante:number,id:number){return this.http.delete<RespuestaDe<'/producto-variantes/{variante}/presentaciones/{presentacion}','delete'>>(urlApi('/producto-variantes/'+variante+'/presentaciones/'+id));}
}
