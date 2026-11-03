import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, model, output } from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { FormActionsComponent, PantallaService } from '@nianva/ui-layout';

import { claseOverlay, TamanoOverlay } from '../overlay.types';

@Component({
  selector: 'ui-drawer',
  standalone: true,
  imports: [Drawer, FormActionsComponent],
  templateUrl: './drawer.component.html',
  styleUrls: ['./drawer.component.scss', '../overlays.scss'],
  // Las clases de overlays.scss deben llegar al contenedor que PrimeNG pinta fuera del componente.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerComponent {
  readonly visible = model(false);
  readonly titulo = input('');
  readonly tamano = input<TamanoOverlay>('md');
  readonly cerrado = output<void>();

  protected readonly pantalla = inject(PantallaService);
  protected readonly clase = computed(() => claseOverlay('ui-drawer', this.tamano(), this.pantalla.angosta()));
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
