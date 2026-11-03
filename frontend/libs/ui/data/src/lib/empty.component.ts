import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-empty',
  standalone: true,
  template: `
    <div class="ui-empty">
      <i [class]="icono()" aria-hidden="true"></i>
      <p>{{ mensaje() }}</p>
      <ng-content />
    </div>
  `,
  styleUrl: './empty.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyComponent {
  readonly mensaje = input('No hay resultados.');
  readonly icono = input('pi pi-inbox');
}
