import { ChangeDetectionStrategy, Component, ViewEncapsulation, effect, inject, input, model, output, computed } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { FormActionsComponent, PantallaService } from '@nianva/ui-layout';

import { claseOverlay, TamanoOverlay } from '../overlay.types';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [Dialog, FormActionsComponent],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss', '../overlays.scss'],
  // Las clases de overlays.scss deben llegar al contenedor que PrimeNG pinta fuera del componente.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly visible = model(false);
  readonly titulo = input('');
  readonly tamano = input<TamanoOverlay>('md');
  readonly cerrado = output<void>();

  protected readonly pantalla = inject(PantallaService);
  protected readonly clase = computed(() => claseOverlay('ui-modal', this.tamano(), this.pantalla.angosta()));
  private ultimoFoco: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.ultimoFoco = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement);
        return;
      }

      const foco = this.ultimoFoco;
      this.ultimoFoco = null;
      foco?.focus();
    });
  }
}
