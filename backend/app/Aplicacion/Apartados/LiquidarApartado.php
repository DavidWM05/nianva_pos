<?php

declare(strict_types=1);

namespace App\Aplicacion\Apartados;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Apartados\Dtos\LiquidarApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;

final class LiquidarApartado
{
    public function __construct(private readonly ApartadoService $service, private readonly RegistrarMovimiento $movimiento) {}

    /** Reutiliza la transacción exterior; bloquea el estado antes de modificar la reserva. */
    public function ejecutar(LiquidarApartadoDto $dto, Apartado $apartado, ?Usuario $usuario): Apartado
    {
        if ($usuario === null) {
            abort(401);
        }
        $operacion = function () use ($apartado, $usuario) {
            $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', (int) $apartado->getAttribute('sucursal_id'))->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();
            $bloqueado = Apartado::query()->whereKey($apartado->id)->lockForUpdate()->firstOrFail();
            $sucursalId = (int) $bloqueado->getAttribute('sucursal_id');
            $items = $bloqueado->detalles->map(static fn ($detalle): array => ['variante_id' => (int) $detalle->getAttribute('variante_id')])->values()->all();
            $stocks = [];
            $variantes = array_values(array_unique(array_column($items, 'variante_id')));
            sort($variantes);
            foreach ($variantes as $varianteId) {
                $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, $sucursalId, 'entrada', 1, 'ajuste', $usuario->id));
            }

            return $this->service->liquidarConBloqueos($bloqueado, $usuario->id, $caja, $stocks);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
