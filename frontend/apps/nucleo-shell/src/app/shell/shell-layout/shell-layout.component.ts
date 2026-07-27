import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

/**
 * Layout autenticado: sidebar + breadcrumbs + router-outlet de los
 * modulos. Vive detras de authGuard en app.routes.ts -- nunca se monta
 * (ni se descarga su bundle) para un usuario sin sesion confirmada, para
 * que la navegacion jamas se vea antes de autenticar.
 */
@Component({
  selector: 'nucleo-shell-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, BreadcrumbComponent],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayoutComponent {}
