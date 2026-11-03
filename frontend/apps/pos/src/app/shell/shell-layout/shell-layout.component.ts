import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellComponent } from '@nianva/ui-layout';

import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

/**
 * Layout autenticado: sidebar + breadcrumbs + router-outlet de los
 * modulos. Vive detras de authGuard en app.routes.ts -- nunca se monta
 * (ni se descarga su bundle) para un usuario sin sesion confirmada, para
 * que la navegacion jamas se vea antes de autenticar.
 *
 * El marco responsivo (menu fijo en pantalla ancha, panel en angosta) lo
 * resuelve ui-shell de ui/layout (UI-04): este componente no tiene CSS.
 */
@Component({
  selector: 'nucleo-pos-layout',
  standalone: true,
  imports: [RouterOutlet, ShellComponent, SidebarComponent, BreadcrumbComponent],
  templateUrl: './shell-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayoutComponent {}
