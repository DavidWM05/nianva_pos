import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { FormActionsComponent, PantallaService } from '@nianva/ui-layout';

import { claseOverlay, TamanoOverlay } from '../overlay.types';

let siguienteIdDrawer = 0;

@Component({
  selector: 'ui-drawer',
  standalone: true,
  imports: [FormActionsComponent, MatIconButton, MatSidenavModule],
  templateUrl: './drawer.component.html',
  styleUrls: ['./drawer.component.scss', '../overlays.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerComponent {
  protected readonly idTitulo = `ui-drawer-titulo-${++siguienteIdDrawer}`;
  readonly visible = model(false);
  readonly titulo = input('');
  readonly tamano = input<TamanoOverlay>('md');
  readonly cerrado = output<void>();

  protected readonly pantalla = inject(PantallaService);
  protected readonly clase = computed(() => claseOverlay('ui-drawer', this.tamano(), this.pantalla.angosta()));
  private readonly drawer = viewChild<MatDrawer>('drawer');

  constructor() {
    effect(() => {
      const drawer = this.drawer();

      if (!drawer) {
        return;
      }

      if (this.visible() && !drawer.opened) {
        drawer.open();
        return;
      }

      if (!this.visible() && drawer.opened) {
        drawer.close();
      }
    });
  }

  protected alCambiarAbierto(abierto: boolean): void {
    if (this.visible() === abierto) {
      return;
    }

    this.visible.set(abierto);

    if (!abierto) {
      this.cerrado.emit();
    }
  }

  protected cerrar(): void {
    if (!this.visible()) {
      return;
    }

    this.visible.set(false);
    this.cerrado.emit();
    this.drawer()?.close();
  }
}
