import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  FormActionsComponent,
  PageComponent,
  PageHeaderComponent,
  PantallaService,
  SectionComponent,
} from '@nianva/ui-layout';

@Component({
  selector: 'cat-layout-page',
  standalone: true,
  imports: [FormActionsComponent, MatButton, PageComponent, PageHeaderComponent, SectionComponent],
  template: `
    <ui-page-header clave="catalogo-layout" subtitulo="Encabezado, estados de página y secciones" />

    <ui-section titulo="PantallaService">
      <p>La señal <code>angosta</code> está {{ pantalla.angosta() ? 'activa' : 'inactiva' }}.</p>
    </ui-section>

    <ui-section titulo="Page listo">
      <ui-page estado="listo" forma="listado">
        <p>Contenido de la página cuando está listo.</p>
      </ui-page>
    </ui-section>

    <ui-section titulo="Page cargando">
      <ui-page estado="cargando" forma="listado">
        <p>Este contenido no se muestra durante la carga.</p>
      </ui-page>
    </ui-section>

    <ui-section titulo="Page con error">
      <ui-page estado="error" forma="listado" (reintentar)="reintentos.set(reintentos() + 1)">
        <p>Este contenido no se muestra con error.</p>
      </ui-page>
      <p>Reintentos: {{ reintentos() }}</p>
    </ui-section>

    <ui-section titulo="Section y FormActions">
      <ui-section titulo="Datos generales">
        <p>Contenido de una sección.</p>
      </ui-section>
      <ui-form-actions>
        <button matButton="outlined" type="button">Cancelar</button>
        <button matButton="filled" type="button">Guardar</button>
      </ui-form-actions>
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutPage {
  protected readonly pantalla = inject(PantallaService);
  protected readonly reintentos = signal(0);
}
