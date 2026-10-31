import { Injectable, inject } from '@angular/core';
import { BuscadorEntidad } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { UsuarioAdminService } from './usuario-admin.service';
import { UsuarioAdmin } from './usuario.types';

/**
 * Adapta UsuarioAdminService (paginado, con `evento`/`busqueda` propios de
 * DataTableComponent) al contrato generico BuscadorEntidad -- mismo patron
 * que ClienteBuscadorService en Crm. Primer consumidor: asignar repartidor
 * a un pedido en Delivery, sin que ese modulo importe UsuarioAdminService
 * directamente (CLAUDE.md §4).
 */
@Injectable({ providedIn: 'root' })
export class UsuarioBuscadorService extends BuscadorEntidad<UsuarioAdmin> {
  private readonly usuarioAdminService = inject(UsuarioAdminService);

  buscar(texto: string): Observable<UsuarioAdmin[]> {
    return this.usuarioAdminService
      .listar({ first: 0, rows: 10, sortField: null, sortOrder: null, filters: {} }, texto)
      .pipe(map((respuesta) => respuesta.data));
  }

  obtener(id: number): Observable<UsuarioAdmin> {
    return this.usuarioAdminService.obtener(id).pipe(map((respuesta) => respuesta.usuario));
  }
}
