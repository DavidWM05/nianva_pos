<?php

declare(strict_types=1);

namespace App\Aplicacion\NotasCredito;

use App\Modules\NotasCredito\Dtos\AplicarNotaCreditoDto;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use Illuminate\Support\Facades\DB;

final class AplicarNotaCredito
{
    public function __construct(private readonly NotaCreditoService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(AplicarNotaCreditoDto $dto): void
    {
        $operacion = function () use ($dto) {
            $nota = NotaCredito::query()->whereKey($dto->notaCreditoId)->lockForUpdate()->firstOrFail();
            $this->service->usarEnVentaConNota($nota, $dto->ventaId, $dto->monto);
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
