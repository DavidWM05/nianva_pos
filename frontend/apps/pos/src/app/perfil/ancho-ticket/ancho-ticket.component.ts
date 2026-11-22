import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AnchoTicket, PreferenciaTicketService } from '../../core/impresos/preferencia-ticket.service';

/**
 * Ancho del papel de tickets de esta terminal (UI-12): depende de su impresora térmica, así que se
 * guarda en el dispositivo. Lo usan los botones de imprimir ticket, corte y comprobante.
 */
@Component({
  selector: 'nucleo-ancho-ticket',
  standalone: true,
  template: `
    <fieldset>
      <legend>Ancho del papel de tickets</legend>
      @for (opcion of opciones; track opcion.valor) {
        <label>
          <input type="radio" name="ancho-ticket" [value]="opcion.valor" [checked]="preferencia.ancho() === opcion.valor" (change)="preferencia.establecer(opcion.valor)" />
          {{ opcion.etiqueta }}
        </label>
      }
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnchoTicketComponent {
  protected readonly preferencia = inject(PreferenciaTicketService);
  protected readonly opciones: { valor: AnchoTicket; etiqueta: string }[] = [
    { valor: 'ticket-58', etiqueta: '58 mm' },
    { valor: 'ticket-80', etiqueta: '80 mm' },
  ];
}
