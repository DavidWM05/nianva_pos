import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlertComponent } from '@nianva/ui-feedback';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';

import { ITEM_FUNCION_NO_INCLUIDA, NUCLEO_ITEM_INICIO, NUCLEO_NAV_GROUPS } from '../modules/modules.config';

@Component({
  selector: 'nucleo-funcion-no-incluida',
  imports: [AlertComponent, MatButton, PageComponent, PageHeaderComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header [clave]="clave" />
    <ui-page [estado]="parametros() ? 'listo' : 'cargando'" forma="detalle">
      <ui-alert tono="info">{{ explicacion() }}</ui-alert>
      <p><a matButton="outlined" [routerLink]="inicio">Volver a Inicio</a></p>
    </ui-page>
  `,
})
export class FuncionNoIncluidaComponent {
  protected readonly parametros = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly clave = ITEM_FUNCION_NO_INCLUIDA.key;
  protected readonly inicio = ['/', NUCLEO_ITEM_INICIO.path];

  protected readonly explicacion = computed(() => {
    const parametros = this.parametros();
    const funcion = NUCLEO_NAV_GROUPS.flatMap((grupo) => grupo.items)
      .find((entrada) => entrada.key === parametros?.get('funcion'));
    if (!funcion) return 'Esta función no está disponible para tu empresa.';
    if (parametros?.get('motivo') === 'feature') return `Tu plan no incluye esta función: ${funcion.label}.`;
    if (parametros?.get('motivo') === 'modulo') return `${funcion.label} está desactivada para tu empresa.`;

    return 'Esta función no está disponible para tu empresa.';
  });
}
