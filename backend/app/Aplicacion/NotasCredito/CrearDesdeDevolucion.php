<?php

declare(strict_types=1);

namespace App\Aplicacion\NotasCredito;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use Illuminate\Support\Facades\DB;

final class CrearDesdeDevolucion
{
    public function __construct(private readonly NotaCreditoService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(int $devolucionId): NotaCredito
    {
        $operacion = function () use ($devolucionId) {
            $devolucion = Devolucion::query()->whereKey($devolucionId)->lockForUpdate()->firstOrFail();

            return $this->service->crearDesdeDevolucion($devolucion);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
