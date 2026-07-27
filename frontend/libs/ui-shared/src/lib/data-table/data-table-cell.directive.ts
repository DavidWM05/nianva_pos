import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Marca un <ng-template> como el renderizador de una columna especifica
 * de nucleo-data-table -- para columnas que necesitan algo mas que texto
 * plano (un nucleo-status-badge, botones de accion, un link). Si una
 * columna no tiene un template asociado, la tabla sigue mostrando
 * {{ rowData[col.field] }} como hasta ahora.
 *
 *   <nucleo-data-table [columns]="columns" [value]="clientes">
 *     <ng-template nucleoDataTableCell="activo" let-row>
 *       <nucleo-status-badge [value]="row.activo ? 'activo' : 'inactivo'" ... />
 *     </ng-template>
 *     <ng-template nucleoDataTableCell="acciones" let-row>
 *       <p-button label="Editar" (click)="editar(row)" />
 *     </ng-template>
 *   </nucleo-data-table>
 */
@Directive({
  selector: 'ng-template[nucleoDataTableCell]',
  standalone: true,
})
export class DataTableCellDirective {
  @Input('nucleoDataTableCell') field!: string;

  readonly templateRef = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}
