import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { PantallaService } from './pantalla.service';

/**
 * Marco de la app autenticada (UI-04): menu, encabezado y contenido.
 *
 * - Pantalla ancha: el menu queda fijo a la izquierda.
 * - Pantalla angosta (< md): el menu se oculta y se abre como panel desde el
 *   boton del encabezado; se cierra al navegar, con Escape o tocando fuera.
 *
 *   <ui-shell>
 *     <nav menu>...</nav>
 *     <app-breadcrumb encabezado />
 *     <router-outlet />
 *   </ui-shell>
 */
@Component({
  selector: 'ui-shell',
  standalone: true,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'cerrarMenu()',
  },
})
export class ShellComponent {
  protected readonly angosta = inject(PantallaService).angosta;
  protected readonly menuAbierto = signal(false);

  constructor() {
    const suscripcion = inject(Router)
      .events.pipe(filter((evento) => evento instanceof NavigationEnd))
      .subscribe(() => this.cerrarMenu());
    inject(DestroyRef).onDestroy(() => suscripcion.unsubscribe());

    // Al pasar a pantalla ancha, el panel no queda abierto por detras.
    effect(() => {
      if (!this.angosta()) {
        this.menuAbierto.set(false);
      }
    });
  }

  abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
