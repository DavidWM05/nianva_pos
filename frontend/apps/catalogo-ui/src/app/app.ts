import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmDialogHostComponent, ToastHostComponent } from '@nianva/ui-feedback';
import { ShellComponent } from '@nianva/ui-layout';

import { CATALOGO_NAVEGACION } from './navegacion';
import { TemaService } from './tema.service';

@Component({
  selector: 'cat-root',
  standalone: true,
  imports: [
    ConfirmDialogHostComponent,
    MatButton,
    MatListModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ShellComponent,
    ToastHostComponent,
  ],
  template: `
    <ui-shell>
      <nav menu aria-label="Secciones del catálogo">
        <mat-nav-list class="cat-nav">
          @for (enlace of enlaces; track enlace.clave) {
            <a
              mat-list-item
              [routerLink]="enlace.ruta"
              routerLinkActive="cat-nav__activo"
              [routerLinkActiveOptions]="{ exact: enlace.ruta === '/' }"
            >
              <i matListItemIcon [class]="enlace.icono" aria-hidden="true"></i>
              <span matListItemTitle>{{ enlace.nombre }}</span>
            </a>
          }
        </mat-nav-list>
      </nav>
      <div encabezado>
        <strong>Catálogo UI</strong>
        <button matButton="outlined" type="button" (click)="tema.alternar()">
          {{ tema.oscuro() ? 'Tema claro' : 'Tema oscuro' }}
        </button>
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
  protected readonly enlaces = CATALOGO_NAVEGACION.map((enlace) => ({
    ...enlace,
    ruta: enlace.ruta === '' ? '/' : `/${enlace.ruta}`,
  }));
}
