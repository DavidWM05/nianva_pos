import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { CantidadPipe, DineroPipe, FechaHoraPipe } from '@nianva/ui-format';

import { ESTILOS_IMPRESO } from '../estilos-impreso';
import { FormatoImpreso, Impreso } from '../impreso.types';

/**
 * Un impreso (UI-12): ticket de 58 u 80 mm o carta, con el único encabezado y pie de todos los
 * documentos. Pinta la foto que arma el servidor: no calcula ni toma datos de la sesión (la
 * sucursal es la del documento). Sirve en pantalla, en el catálogo y, serializado, dentro del
 * iframe que imprime ImpresionService.
 */
@Component({
  selector: 'ui-impreso',
  standalone: true,
  imports: [CantidadPipe, DineroPipe, FechaHoraPipe],
  template: `
    @let documento = impreso();
    @let encabezado = documento.encabezado;
    <article class="ui-impreso" [class]="'ui-impreso ui-impreso--' + formato()">
      <header class="ui-impreso__encabezado">
        <p class="ui-impreso__empresa">{{ encabezado.empresa }}</p>
        @if (encabezado.rfc) {
          <p class="ui-impreso__dato">RFC {{ encabezado.rfc }}</p>
        }
        @if (encabezado.telefono) {
          <p class="ui-impreso__dato">Tel. {{ encabezado.telefono }}</p>
        }
        <p class="ui-impreso__dato">{{ encabezado.sucursal }}</p>
        <p class="ui-impreso__titulo">{{ documento.titulo }}</p>
        <p class="ui-impreso__dato">Folio {{ encabezado.folio ?? 'sin folio' }}</p>
        @if (encabezado.fecha) {
          <p class="ui-impreso__dato">{{ encabezado.fecha | fechaHora }}</p>
        }
        @if (encabezado.usuario) {
          <p class="ui-impreso__dato">Atendió: {{ encabezado.usuario }}</p>
        }
      </header>

      @if (documento.tabla; as tabla) {
        <hr class="ui-impreso__separador" />
        <table class="ui-impreso__tabla">
          <thead>
            <tr>
              @for (columna of tabla.columnas; track $index) {
                <th scope="col" [class.ui-impreso__num]="columna.numerica">{{ columna.titulo }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (fila of tabla.filas; track $index) {
              <tr>
                @for (celda of fila; track $index) {
                  @if ('dinero' in celda) {
                    <td class="ui-impreso__num">{{ celda.dinero | dinero }}</td>
                  } @else if ('cantidad' in celda) {
                    <td class="ui-impreso__num">{{ celda.cantidad | cantidad: celda.unidad }}</td>
                  } @else {
                    <td>
                      {{ celda.texto }}
                      @if (celda.detalle) {
                        <br />{{ celda.detalle | dinero }}
                      }
                    </td>
                  }
                }
              </tr>
            }
          </tbody>
        </table>
      }

      <hr class="ui-impreso__separador" />
      <table class="ui-impreso__totales">
        <tbody>
          @for (renglon of documento.totales; track $index) {
            <tr [class.ui-impreso__destacado]="renglon.destacado">
              <td>{{ renglon.etiqueta }}</td>
              <td class="ui-impreso__num">{{ renglon.importe | dinero }}</td>
            </tr>
          }
          @for (pago of documento.pagos; track $index) {
            <tr>
              <td>{{ pago.etiqueta }}</td>
              <td class="ui-impreso__num">{{ pago.importe | dinero }}</td>
            </tr>
          }
        </tbody>
      </table>

      <footer class="ui-impreso__pie">
        <hr class="ui-impreso__separador" />
        @if (documento.pie) {
          <p>{{ documento.pie }}</p>
        }
      </footer>
    </article>
  `,
  styles: [ESTILOS_IMPRESO],
  // Sin encapsulación: las mismas clases se usan en el documento del iframe que se imprime.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpresoComponent {
  readonly impreso = input.required<Impreso>();
  readonly formato = input<FormatoImpreso>('ticket-80');
}
