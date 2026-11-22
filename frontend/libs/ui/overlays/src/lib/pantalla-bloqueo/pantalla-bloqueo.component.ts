import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

let siguientePantallaBloqueo = 0;

/**
 * Pantalla de bloqueo de la sesion (SEG-12): cubre toda la ventana con fondo opaco, para que no
 * se vean ventas ni montos, y se anuncia como dialogo modal con el titulo como nombre. El
 * contenido (el PIN y sus acciones) lo pone la app. El resto de la pagina lo deja inerte quien la
 * muestra, para que el foco no salga de aqui.
 *
 *   <ui-pantalla-bloqueo titulo="Sesión bloqueada">…</ui-pantalla-bloqueo>
 */
@Component({
  selector: 'ui-pantalla-bloqueo',
  standalone: true,
  template: `
    <div class="ui-pantalla-bloqueo" role="dialog" aria-modal="true" [attr.aria-labelledby]="idTitulo">
      <div class="ui-pantalla-bloqueo__tarjeta">
        <h1 class="ui-pantalla-bloqueo__titulo" [id]="idTitulo">{{ titulo() }}</h1>
        <ng-content />
      </div>
    </div>
  `,
  styleUrl: './pantalla-bloqueo.component.scss',
  // Sin encapsulacion: el contenido proyectado hereda el espaciado de la tarjeta.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PantallaBloqueoComponent {
  readonly titulo = input.required<string>();

  protected readonly idTitulo = `ui-pantalla-bloqueo-titulo-${++siguientePantallaBloqueo}`;
}
