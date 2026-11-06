<?php

declare(strict_types=1);

namespace App\Aplicacion\Cotizaciones;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Cotizaciones\Dtos\ConvertirCotizacionDto;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;

final class ConvertirCotizacion
{
    public function __construct(private readonly CotizacionService $service, private readonly RegistrarMovimiento $movimiento) {}

    public function ejecutar(ConvertirCotizacionDto $dto, int $id, Usuario $usuario): Venta
    {
        $operacion = function () use ($dto, $id, $usuario) {
            $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', Cotizacion::query()->select('sucursal_id')->whereKey($id))->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();
            $cotizacion = Cotizacion::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $cotizacion->load('detalles');
            $variantes = array_values(array_unique($cotizacion->detalles->pluck('variante_id')->map(static fn ($id): int => (int) $id)->all()));
            sort($variantes);
            $stocks = [];
            if ($caja !== null) {
                foreach ($variantes as $varianteId) {
                    $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, (int) $cotizacion->getAttribute('sucursal_id'), 'salida', 1, 'venta', $usuario->id));
                }
            }

            return $this->service->convertirConBloqueos($cotizacion, ['usuario_id' => $usuario->id, 'metodo_pago_id' => $dto->metodoPagoId], $caja, $stocks);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
