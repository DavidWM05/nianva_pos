import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { ConfirmDialogHostComponent, ToastHostComponent } from '@nianva/ui-feedback';
import { ShellComponent } from '@nianva/ui-layout';

import { CATALOGO_NAVEGACION } from './navegacion';
import { TemaService } from './tema.service';

@Component({
  selector: 'cat-root',
  standalone: true,
  imports: [Button, ConfirmDialogHostComponent, RouterLink, RouterOutlet, ShellComponent, ToastHostComponent],
  template: `
    <ui-shell>
      <nav menu>
        @for (enlace of enlaces; track enlace.clave) {
          <a [routerLink]="enlace.ruta === '' ? '/' : '/' + enlace.ruta">{{ enlace.nombre }}</a>
        }
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
  protected readonly enlaces = CATALOGO_NAVEGACION;
}
