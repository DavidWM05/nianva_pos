import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { ConfirmDialogHostComponent, ToastHostComponent } from '@nianva/ui-feedback';
import { ShellComponent } from '@nianva/ui-layout';

import { CATALOGO_NAVEGACION } from './navegacion';
import { TemaService } from './tema.service';

@Component({
  selector: 'cat-root',
  standalone: true,
  imports: [Button, ConfirmDialogHostComponent, Menu, RouterOutlet, ShellComponent, ToastHostComponent],
  template: `
    <ui-shell>
      <nav menu aria-label="Secciones del catálogo">
        <p-menu [model]="enlaces" />
      </nav>
      <div encabezado>
        <strong>Catálogo UI</strong>
        <p-button
          [label]="tema.oscuro() ? 'Tema claro' : 'Tema oscuro'"
          severity="secondary"
          (onClick)="tema.alternar()"
        />
      </div>
      <router-outlet />
    </ui-shell>
    <nucleo-toast-host />
    <nucleo-confirm-dialog-host />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly tema = inject(TemaService);
  // p-menu en vez de enlaces sueltos: en el espacio [menu] del shell, unos <a> sin estilo se
  // pintaban en una sola linea y empujaban el contenido a la mitad derecha.
  protected readonly enlaces: MenuItem[] = CATALOGO_NAVEGACION.map((enlace) => ({
    label: enlace.nombre,
    icon: enlace.icono,
    routerLink: enlace.ruta === '' ? '/' : `/${enlace.ruta}`,
  }));
}
