<?php

declare(strict_types=1);

namespace App\Aplicacion\GiftCards;

use App\Aplicacion\Caja\CajaDeTerminal;
use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\GiftCards\Exceptions\RecargaPagoNoCuadraException;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\GiftCards\Models\GiftCardRecargaPago;
use App\Modules\GiftCards\Services\GiftCardService;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Services\LibroCaja;
use Illuminate\Support\Facades\DB;

final class RecargarGiftCard
{
    public function __construct(private readonly GiftCardService $service, private readonly LibroCaja $libro) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(RecargarGiftCardDto $dto, int $id, Usuario $usuario, ?Terminal $terminal = null): GiftCard
    {
        $operacion = function () use ($dto, $id, $usuario, $terminal) {
            // Bloquear la caja de la terminal antes del documento.
            $caja = CajaDeTerminal::bloquearAbierta($usuario, $terminal);

            $suma = Dinero::desde('0');
            $monetarios = [];
            foreach ($dto->pagos as $pago) {
                $suma = $suma->sumar(Dinero::desde((string) $pago->monto));
                if ($this->libro->esMonetario($pago->metodoPagoId)) {
                    $monetarios[] = $pago;
                }
            }
            $monto = Dinero::desde((string) $dto->monto);
            if ($dto->pagos === [] || $suma->comparar($monto) !== 0) {
                throw new RecargaPagoNoCuadraException($monto->aCadena(), $suma->aCadena());
            }
            if ($monetarios !== [] && $caja === null) {
                throw new CajaSesionNoAbiertaException((int) $usuario->getAttribute('sucursal_id'));
            }
            $tarjeta = GiftCard::query()->whereKey($id)->lockForUpdate()->firstOrFail();

            $resultado = $this->service->recargarConTarjeta($tarjeta, $dto->monto, $usuario->id, $monetarios === [] ? null : (int) $caja->getKey());
            $recarga = GiftCardRecarga::query()->where('gift_card_id', $tarjeta->id)->latest('id')->firstOrFail();
            foreach ($dto->pagos as $pago) {
                GiftCardRecargaPago::query()->create(['recarga_id' => $recarga->id, 'metodo_pago_id' => $pago->metodoPagoId, 'monto' => Dinero::desde((string) $pago->monto)->aCadena()]);
            }
            if ($caja !== null) {
                foreach ($monetarios as $pago) {
                    $this->libro->registrar($caja, 'recarga_gc', Dinero::desde((string) $pago->monto)->aCadena(), 'gift_card_recargas', (int) $recarga->id, (int) $usuario->id, $pago->metodoPagoId);
                }
            }

            return $resultado;
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
