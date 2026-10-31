import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { ClienteService } from './cliente.service';
import { Cliente } from './cliente.types';

/**
 * Adapta ClienteService (paginado, con `evento`/`busqueda` propios de
 * DataTableComponent) al contrato generico BuscadorEntidad que pide
 * EntidadSelectorComponent (ui-shared) -- mismo patron que
 * ProductoBuscadorService en Inventario. Primer consumidor: la pantalla
 * de venta de TPV, para buscar el cliente de una venta sin que ese
 * modulo importe ClienteService directamente.
 */
@Injectable({ providedIn: 'root' })
export class ClienteBuscadorService extends BuscadorEntidad<Cliente> {
  private readonly clienteService = inject(ClienteService);

  buscar(texto: string): Observable<Cliente[]> {
    return this.clienteService
      .listar({ first: 0, rows: 10, sortField: null, sortOrder: null, filters: {} }, texto)
      .pipe(map((respuesta) => respuesta.data));
  }

  obtener(id: number): Observable<Cliente> {
    return this.clienteService.obtener(id).pipe(map((respuesta) => respuesta.cliente));
  }
}
