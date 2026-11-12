import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Miga {
  readonly etiqueta: string;
  readonly ruta: string;
  /** Clase de PrimeIcons, decorativa (por ejemplo, `pi pi-home` en Inicio). */
  readonly icono?: string;
}

/**
 * Ruta de navegacion (breadcrumb) del encabezado. La app arma las migas (en pos, desde el
 * `data.breadcrumb` de cada ruta); este componente solo las pinta: todas son enlaces menos la
 * ultima, que es la pagina actual (`aria-current="page"`).
 *
 *   <ui-migas [migas]="[{ etiqueta: 'Inicio', ruta: '/', icono: 'pi pi-home' }, { etiqueta: 'Clientes', ruta: '/crm' }]" />
 */
@Component({
  selector: 'ui-migas',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './migas.component.html',
  styleUrl: './migas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MigasComponent {
  readonly migas = input<readonly Miga[]>([]);
}
