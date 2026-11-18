import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad, EntidadBuscable } from '@nianva/ui-shared';
import { map, Observable } from 'rxjs';
import { ListaPrecioListadoService } from '@nianva/domain-precios';
@Injectable({ providedIn: 'root' })
export class ListaPrecioBuscadorService extends BuscadorEntidad<EntidadBuscable> {
  private readonly listas = inject(ListaPrecioListadoService);
  buscar(texto: string): Observable<EntidadBuscable[]> {
    return this.listas
      .disponibles()
      .pipe(
        map((listas) =>
          listas.filter((lista) =>
            lista.nombre
              .toLocaleLowerCase()
              .includes(texto.toLocaleLowerCase()),
          ),
        ),
      );
  }
  obtener(id: number): Observable<EntidadBuscable> {
    return this.listas.disponibles().pipe(
      map((listas) => {
        const lista = listas.find((lista) => lista.id === id);
        if (!lista) throw new Error('Lista no disponible.');
        return lista;
      }),
    );
  }
}
