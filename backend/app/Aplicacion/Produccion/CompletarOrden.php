<?php

declare(strict_types=1);

namespace App\Aplicacion\Produccion;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Services\ProduccionService;
use Illuminate\Support\Facades\DB;

final class CompletarOrden
{
    public function __construct(private readonly ProduccionService $service, private readonly BloqueosProduccion $bloqueos, private readonly RegistrarMovimiento $movimiento) {}

    public function ejecutar(int $id, int $cantidadProducida): OrdenProduccion
    {
        $operacion = function () use ($id, $cantidadProducida) {
            $orden = OrdenProduccion::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $receta = $this->bloqueos->receta((int) $orden->getAttribute('receta_id'));
            $sucursalId = (int) $orden->getAttribute('sucursal_id');
            $lotes = $this->bloqueos->lotes($receta, $sucursalId);
            $terminado = $this->movimiento->bloquearStock(new MovimientoInventarioDto((int) $receta->getAttribute('variante_id'), $sucursalId, 'entrada', 1, 'ajuste', (int) $orden->getAttribute('usuario_id')));

            return $this->service->completarOrdenConBloqueos($orden, $receta, $lotes, $terminado, $cantidadProducida);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
