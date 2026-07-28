export type EstadoGiftCard = 'activa' | 'usada' | 'expirada' | 'cancelada';

export interface GiftCardClienteResumen {
  id: number;
  nombre: string;
}

export interface GiftCardRecargaUsuario {
  id: number;
  nombre: string;
}

export interface GiftCardRecarga {
  id: number;
  monto: string;
  usuario: GiftCardRecargaUsuario | null;
  fecha: string;
}

export interface GiftCard {
  id: number;
  cliente: GiftCardClienteResumen | null;
  codigo: string;
  saldo_inicial: string;
  saldo_actual: string;
  fecha_expiracion: string | null;
  estado: EstadoGiftCard;
  recargas?: GiftCardRecarga[];
  created_at: string;
}

export interface GiftCardEmitirPayload {
  cliente_id: number | null;
  monto: number;
  fecha_expiracion?: string | null;
}
