import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { conUmbral } from '@nianva/ui-feedback';

@Component({
  selector: 'ui-btn-enviar',
  standalone: true,
  template: `
    <button
      type="submit"
      class="ui-btn-enviar"
      [disabled]="enviando()"
      [attr.aria-busy]="enviando()"
      (click)="alClick($event)"
    >
      @if (mostrarIndicador()) {
        <i class="pi pi-spin pi-spinner ui-btn-enviar__indicador" aria-hidden="true"></i>
      }
      <span>{{ etiqueta() }}</span>
    </button>
  `,
  styleUrl: './btn-enviar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BtnEnviarComponent {
  readonly etiqueta = input('Guardar');
  readonly enviando = input(false);
  protected readonly mostrarIndicador = conUmbral(this.enviando);

  protected alClick(evento: MouseEvent): void {
    if (this.enviando()) {
      evento.preventDefault();
      evento.stopPropagation();
    }
  }
}
