<?php

declare(strict_types=1);

namespace App\Aplicacion\Apartados;

use App\Aplicacion\Caja\CajaDeTerminal;
use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Services\LibroCaja;
use Illuminate\Support\Facades\DB;

final class RegistrarAbonoApartado
{
    public function __construct(private readonly ApartadoService $service, private readonly LibroCaja $libro) {}

    /** Reutiliza una transacción exterior si existe. */
    public function ejecutar(RegistrarAbonoApartadoDto $dto, Apartado $apartado, Usuario $usuario, ?Terminal $terminal = null): ApartadoAbono
    {
        $operacion = function () use ($dto, $apartado, $usuario, $terminal): ApartadoAbono {
            $caja = CajaDeTerminal::bloquearAbierta($usuario, $terminal);
            $monetarios = array_values(array_filter($dto->pagos, fn (PagoApartadoDto $pago): bool => $pago->monto > 0 && $this->libro->esMonetario($pago->metodoPagoId)));
            if ($monetarios !== [] && $caja === null) {
                throw new CajaSesionNoAbiertaException((int) $usuario->getAttribute('sucursal_id'));
            }
            $bloqueado = Apartado::query()->whereKey($apartado->id)->lockForUpdate()->firstOrFail();
            $pagos = array_map(static fn (PagoApartadoDto $pago): array => ['metodo_pago_id' => $pago->metodoPagoId, 'monto' => $pago->monto], $dto->pagos);

            $abono = $this->service->registrarAbonoConApartado($bloqueado, $dto->monto, $usuario->id, $pagos, $dto->notas);
            $abono->update(['caja_sesion_id' => $caja?->id]);
            if ($caja !== null) {
                foreach ($monetarios as $pago) {
                    $this->libro->registrar($caja, 'abono_apartado', Dinero::desde((string) $pago->monto)->aCadena(), 'apartado_abonos', (int) $abono->id, (int) $usuario->id, $pago->metodoPagoId);
                }
            }

            return $abono;
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
