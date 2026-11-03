import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SkeletonComponent } from '@nianva/ui-feedback';
import { Button } from 'primeng/button';

export type EstadoPagina = 'cargando' | 'error' | 'listo';
export type FormaPagina = 'listado' | 'detalle' | 'formulario';

/**
 * Cuerpo de una pagina con sus estados de carga (UI-18): en la primera
 * carga un skeleton con la forma del contenido, si falla el error con
 * "Reintentar", y el contenido cuando esta listo. La pantalla solo dice en
 * que estado esta; nunca escribe un texto "Cargando...".
 *
 *   <ui-page [estado]="estado()" forma="detalle" (reintentar)="cargar()">
 *     ...contenido...
 *   </ui-page>
 */
@Component({
  selector: 'ui-page',
  standalone: true,
  imports: [SkeletonComponent, Button],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  readonly estado = input.required<EstadoPagina>();
  readonly forma = input<FormaPagina>('detalle');
  readonly mensajeError = input('No se pudo cargar la información.');

  readonly reintentar = output<void>();
}
