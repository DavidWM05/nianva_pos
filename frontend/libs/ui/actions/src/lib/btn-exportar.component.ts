import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';

import { conUmbral } from '@nianva/ui-feedback';

@Component({
  selector: 'ui-btn-exportar',
  standalone: true,
  imports: [Button],
  template: `
    <p-button
      label="Exportar"
      icon="pi pi-download"
      severity="secondary"
      ariaLabel="Exportar"
      [disabled]="exportando()"
      [loading]="indicadorVisible()"
      (onClick)="exportar.emit()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonExportarComponent {
  readonly exportando = input(false);
  readonly exportar = output<void>();
  protected readonly indicadorVisible = conUmbral(this.exportando);
}
