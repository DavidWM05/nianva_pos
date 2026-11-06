<?php

declare(strict_types=1);

namespace App\Aplicacion\CuentasPagar;

use App\Modules\CuentasPagar\Dtos\RegistrarPagoDto;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\CuentasPagar\Services\CuentasPagarService;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;

final class RegistrarPago
{
    public function __construct(private readonly CuentasPagarService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(RegistrarPagoDto $dto, int $cuentaId, Usuario $usuario): AbonoPagar
    {
        $operacion = function () use ($dto, $cuentaId, $usuario) {
            // Resolver caja abierta de la sucursal antes de bloquear la cuenta.
            $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', (int) $usuario->getAttribute('sucursal_id'))->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();
            $cuenta = CuentaPagar::query()->whereKey($cuentaId)->lockForUpdate()->firstOrFail();

            return $this->service->registrarPagoConBloqueos($cuenta, [
                'sucursal_id' => (int) $usuario->getAttribute('sucursal_id'),
                'usuario_id' => $usuario->id,
                'monto' => $dto->monto,
                'metodo_pago_id' => $dto->metodoPagoId,
                'referencia' => $dto->referencia,
            ], $caja);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
