import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Bloque con titulo dentro de una pagina (datos generales, direccion,
 * historial...). El espaciado y la tipografia los fija el componente.
 */
@Component({
  selector: 'ui-section',
  standalone: true,
  template: `
    <section class="ui-section">
      <h2>{{ titulo() }}</h2>
      <ng-content />
    </section>
  `,
  styleUrl: './section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionComponent {
  readonly titulo = input.required<string>();
}
