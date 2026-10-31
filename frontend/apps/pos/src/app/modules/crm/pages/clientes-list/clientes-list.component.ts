import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  ConfirmDialogService,
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  StatusBadgeComponent,
  ToastService,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Subject, debounceTime } from 'rxjs';

import { ClienteService } from '../../cliente.service';
import { Cliente, ClientesPermisos } from '../../cliente.types';

const PERMISOS_VACIOS: ClientesPermisos = { crear: false, editar: false, eliminar: false };

/**
 * Primera pantalla de un modulo de negocio real -- vista de lista.
 *
 * Decision: el filtro es un campo de busqueda propio arriba de la tabla,
 * no el `filterType` de DataTableColumn -- ese campo existe en el tipo
 * pero el `#body`/`#header` de nucleo-data-table todavia no renderiza
 * ninguna fila de filtros para el (queda como deuda pre-existente del
 * componente compartido, no algo que haya que resolver para este modulo).
 * Extender esa parte de un componente que usaran los otros 8 modulos sin
 * poder verificarla en un navegador real era mas riesgo del que vale la
 * pena aqui; un input de busqueda que dispara el mismo mecanismo de
 * recarga server-side cumple el requisito igual.
 *
 * "Nuevo cliente" navega a /crm/clientes/nuevo (vista dedicada, ver
 * ClienteCrearComponent) -- ya no es un modal (ver el reporte del punto 1).
 */
@Component({
  selector: 'nucleo-clientes-list',
  standalone: true,
  imports: [RouterLink, DataTableComponent, DataTableCellDirective, StatusBadgeComponent, Button, InputText],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesListComponent {
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'documento_fiscal', header: 'Documento fiscal' },
    { field: 'telefono', header: 'Teléfono' },
    { field: 'correo', header: 'Correo' },
    { field: 'activo', header: 'Estado' },
    { field: 'acciones', header: '' },
  ];

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<ClientesPermisos>(PERMISOS_VACIOS);
  protected readonly busqueda = signal('');

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly busquedaSubject = new Subject<string>();

  constructor() {
    this.busquedaSubject.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((texto) => {
      this.busqueda.set(texto);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onBuscarInput(texto: string): void {
    this.busquedaSubject.next(texto);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.clienteService.listar(evento, this.busqueda()).subscribe({
      next: (respuesta) => {
        this.clientes.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  irADetalle(cliente: Cliente): void {
    this.router.navigate(['/crm/clientes', cliente.id]);
  }

  async onDesactivar(cliente: Cliente): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar a "${cliente.nombre}"? Ya no estará disponible para nuevas ventas.`,
      header: 'Desactivar cliente',
      severity: 'danger',
    });

    if (!confirmado) {
      return;
    }

    this.clienteService.desactivar(cliente.id).subscribe({
      next: () => {
        this.toast.success('Cliente desactivado.');
        this.cargar(this.ultimoEvento);
      },
      error: () => this.toast.error('No se pudo desactivar el cliente.'),
    });
  }
}
