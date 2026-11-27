<?php

declare(strict_types=1);

namespace App\Aplicacion\Cotizaciones;

use App\Aplicacion\Caja\CajaDeTerminal;
use App\Aplicacion\Folios\Folios;
use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Cotizaciones\Dtos\ConvertirCotizacionDto;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;

final class ConvertirCotizacion
{
    public function __construct(private readonly CotizacionService $service, private readonly RegistrarMovimiento $movimiento) {}

    public function ejecutar(ConvertirCotizacionDto $dto, int $id, Usuario $usuario, ?Terminal $terminal = null): Venta
    {
        $operacion = function () use ($dto, $id, $usuario, $terminal) {
            $caja = CajaDeTerminal::bloquearAbierta($usuario, $terminal);
            $cotizacion = Cotizacion::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            if ((int) $cotizacion->getAttribute('sucursal_id') !== (int) $usuario->getAttribute('sucursal_id')) {
                $caja = null;
            }
            $cotizacion->load('detalles');
            $variantes = array_values(array_unique($cotizacion->detalles->pluck('variante_id')->map(static fn ($id): int => (int) $id)->all()));
            sort($variantes);
            $stocks = [];
            if ($caja !== null) {
                foreach ($variantes as $varianteId) {
                    $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, (int) $cotizacion->getAttribute('sucursal_id'), 'salida', 1, 'venta', $usuario->id));
                }
            }

            return $this->service->convertirConBloqueos($cotizacion, ['usuario_id' => $usuario->id, 'metodo_pago_id' => $dto->metodoPagoId], $caja, $stocks, Folios::asignar((int) $cotizacion->getAttribute('tenant_id'), (int) $cotizacion->getAttribute('sucursal_id'), 'V'));
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
