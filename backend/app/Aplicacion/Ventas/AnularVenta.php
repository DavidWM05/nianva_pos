<?php

declare(strict_types=1);

namespace App\Aplicacion\Ventas;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Dtos\AnularVentaDto;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Support\Facades\DB;

final class AnularVenta
{
    public function __construct(private readonly VentaService $ventaService, private readonly RegistrarMovimiento $movimiento) {}

    /** Reutiliza la transacción de quien la llama; orden de bloqueos: caja, venta, stocks. */
    public function ejecutar(AnularVentaDto $dto, Venta $venta, Usuario $usuario): Venta
    {
        $operacion = function () use ($dto, $venta, $usuario): Venta {
            CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->whereKey($venta->getAttribute('caja_sesion_id'))->lockForUpdate()->firstOrFail();
            $venta = Venta::query()->whereKey($venta->id)->lockForUpdate()->firstOrFail();
            $variantes = $venta->detalles->pluck('variante_id')->unique()->sort()->values()->all();
            $stocks = [];
            foreach ($variantes as $varianteId) {
                $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, (int) $venta->getAttribute('sucursal_id'), 'entrada', 1, 'ajuste', $usuario->id));
            }

            return $this->ventaService->anularVentaConStocks($venta, $dto->motivo, $usuario, $stocks);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
