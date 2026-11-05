import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';

import { conUmbral } from '@nianva/ui-feedback';

@Component({
  selector: 'ui-btn-exportar',
  standalone: true,
  imports: [MatButton],
  template: `
    <button
      matButton="outlined"
      type="button"
      aria-label="Exportar"
      [disabled]="exportando()"
      [showProgress]="indicadorVisible()"
      (click)="exportar.emit()"
    >
      <i class="pi pi-download ui-btn-exportar__icono" matButtonIcon aria-hidden="true"></i>
      <span>Exportar</span>
    </button>
  `,
  styles: `
    .ui-btn-exportar__icono {
      margin-inline-end: var(--nv-spacing-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonExportarComponent {
  readonly exportando = input(false);
  readonly exportar = output<void>();
  protected readonly indicadorVisible = conUmbral(this.exportando);
}
