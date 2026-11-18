/** Espejo de MetodoPagoController::index() del backend. */
export interface MetodoPago {
  id: number;
  nombre: string;
  tipo: 'efectivo' | 'tarjeta' | 'transferencia' | 'digital' | 'otro';
}
