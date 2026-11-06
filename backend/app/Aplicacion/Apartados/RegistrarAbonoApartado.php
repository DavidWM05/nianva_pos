<?php

declare(strict_types=1);

namespace App\Aplicacion\Apartados;

use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Support\Facades\DB;

final class RegistrarAbonoApartado
{
    public function __construct(private readonly ApartadoService $service) {}

    /** Reutiliza una transacción exterior si existe. */
    public function ejecutar(RegistrarAbonoApartadoDto $dto, Apartado $apartado, Usuario $usuario): ApartadoAbono
    {
        $operacion = function () use ($dto, $apartado, $usuario): ApartadoAbono {
            $bloqueado = Apartado::query()->whereKey($apartado->id)->lockForUpdate()->firstOrFail();
            $pagos = array_map(static fn (PagoApartadoDto $pago): array => ['metodo_pago_id' => $pago->metodoPagoId, 'monto' => $pago->monto], $dto->pagos);

            return $this->service->registrarAbonoConApartado($bloqueado, $dto->monto, $usuario->id, $pagos, $dto->notas);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
