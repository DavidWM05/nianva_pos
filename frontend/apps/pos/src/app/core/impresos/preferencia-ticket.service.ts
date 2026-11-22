import { Injectable, signal } from '@angular/core';

export type AnchoTicket = 'ticket-58' | 'ticket-80';

const CLAVE = 'nv-ancho-ticket';

/**
 * Ancho del papel de tickets de esta terminal (UI-12): depende de su impresora, así que se recuerda
 * en el dispositivo y no en el servidor. Sin preferencia, 80 mm. Si el almacenamiento no está
 * disponible (ventana privada), se usa 80 mm sin recordar.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciaTicketService {
  private readonly anchoSignal = signal<AnchoTicket>(leer());

  readonly ancho = this.anchoSignal.asReadonly();

  establecer(ancho: AnchoTicket): void {
    this.anchoSignal.set(ancho);
    try {
      localStorage.setItem(CLAVE, ancho);
    } catch {
      // Sin almacenamiento: vale para esta sesión.
    }
  }
}

function leer(): AnchoTicket {
  try {
    const guardado = localStorage.getItem(CLAVE);

    return guardado === 'ticket-58' ? 'ticket-58' : 'ticket-80';
  } catch {
    return 'ticket-80';
  }
}
