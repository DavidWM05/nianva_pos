import { Injectable, inject } from '@angular/core';
import { SucursalService } from '@nianva/domain-administracion';
import { BuscadorEntidad, EntidadBuscable } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SucursalBuscadorService extends BuscadorEntidad {
  private readonly sucursales = inject(SucursalService);

  buscar(texto: string): Observable<EntidadBuscable[]> {
    const consulta = texto.trim().toLocaleLowerCase();
    return this.sucursales.listar().pipe(map((sucursales) => sucursales.filter(({ nombre }) =>
      nombre.toLocaleLowerCase().includes(consulta),
    )));
  }

  obtener(id: number): Observable<EntidadBuscable> {
    return this.sucursales.listar().pipe(map((sucursales) => sucursales.find((sucursal) => sucursal.id === id)
      ?? { id, nombre: 'Sucursal ' + id }));
  }
}
