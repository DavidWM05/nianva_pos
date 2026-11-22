import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { DineroPipe } from '@nianva/ui-format';
import {
  DatosComponent,
  FormActionsComponent,
  Miga,
  MigasComponent,
  PageComponent,
  PageHeaderComponent,
  PantallaService,
  SectionComponent,
  TactilComponent,
  TarjetaComponent,
  TarjetasComponent,
} from '@nianva/ui-layout';

@Component({
  selector: 'cat-layout-page',
  standalone: true,
  imports: [
    DatosComponent,
    DineroPipe,
    FormActionsComponent,
    MatButton,
    MatIconButton,
    MigasComponent,
    PageComponent,
    PageHeaderComponent,
    SectionComponent,
    TactilComponent,
    TarjetaComponent,
    TarjetasComponent,
  ],
  template: `
    <ui-page-header clave="catalogo-layout" subtitulo="Encabezado, estados de página y secciones" />

    <ui-section titulo="PantallaService">
      <p>La señal <code>angosta</code> está {{ pantalla.angosta() ? 'activa' : 'inactiva' }}.</p>
    </ui-section>

    <ui-section titulo="Migas">
      <ui-migas [migas]="migas" />
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

    <ui-section titulo="Tarjetas">
      <ul uiTarjetas aria-label="Líneas de ejemplo">
        @for (linea of lineas; track linea.nombre; let i = $index) {
          <li uiTarjeta>
            <h4 class="ui-tarjeta__titulo">Línea {{ i + 1 }}: {{ linea.nombre }}</h4>
            <dl uiDatos>
              <dt>Precio unitario</dt>
              <dd>{{ linea.precio | dinero }}</dd>
              <dt>Subtotal</dt>
              <dd>{{ linea.subtotal | dinero }}</dd>
            </dl>
            <div class="ui-tarjeta__pie">
              <label>
                Cantidad
                <input type="number" min="1" [value]="linea.cantidad" [attr.aria-label]="'Cantidad de ' + linea.nombre" />
              </label>
              <button matIconButton type="button" [attr.aria-label]="'Quitar ' + linea.nombre">
                <i class="pi pi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </li>
        }
      </ul>
    </ui-section>

    <ui-section titulo="Táctil">
      <p>Sin <code>uiTactil</code>:</p>
      <p>
        <button matButton="outlined" type="button">Cancelar</button>
        <button matIconButton type="button" aria-label="Eliminar"><i class="pi pi-trash" aria-hidden="true"></i></button>
        <input type="text" aria-label="Campo nativo sin modo táctil" placeholder="Campo nativo" />
      </p>
      <div uiTactil>
        <p>Con <code>uiTactil</code> (al menos 44 px):</p>
        <p>
          <button matButton="outlined" type="button">Cancelar</button>
          <button matIconButton type="button" aria-label="Eliminar"><i class="pi pi-trash" aria-hidden="true"></i></button>
          <input type="text" aria-label="Campo nativo en modo táctil" placeholder="Campo nativo" />
        </p>
      </div>
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutPage {
  protected readonly pantalla = inject(PantallaService);
  protected readonly reintentos = signal(0);
  // La segunda línea tiene un nombre largo y montos de cinco cifras: el caso que desbordaba la tabla.
  protected readonly lineas = [
    { nombre: 'Agua natural 1 L', precio: 15, cantidad: 2, subtotal: 30 },
    {
      nombre: 'Refrigerador de dos puertas acero inoxidable 500 litros',
      precio: 18499,
      cantidad: 1,
      subtotal: 18499,
    },
  ];
  protected readonly migas: Miga[] = [
    { etiqueta: 'Inicio', ruta: '/', icono: 'pi pi-home' },
    { etiqueta: 'Clientes', ruta: '/layout' },
    { etiqueta: 'Nuevo cliente', ruta: '/layout' },
  ];
}
