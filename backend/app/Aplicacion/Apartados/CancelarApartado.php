<?php

declare(strict_types=1);

namespace App\Aplicacion\Apartados;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Apartados\Dtos\CancelarApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Apartados\Support\ResultadoCancelacion;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Support\Facades\DB;

final class CancelarApartado
{
    public function __construct(private readonly ApartadoService $service, private readonly RegistrarMovimiento $movimiento) {}

    /** Reutiliza la transacción exterior; bloquea el estado antes de modificar la reserva. */
    public function ejecutar(CancelarApartadoDto $dto, Apartado $apartado, Usuario $usuario): ResultadoCancelacion
    {
        $operacion = function () use ($dto, $apartado, $usuario) {
            $bloqueado = Apartado::query()->whereKey($apartado->id)->lockForUpdate()->firstOrFail();
            $sucursalId = (int) $bloqueado->getAttribute('sucursal_id');
            $items = $bloqueado->detalles->map(static fn ($detalle): array => ['variante_id' => (int) $detalle->getAttribute('variante_id')])->values()->all();
            $stocks = [];
            $variantes = array_values(array_unique(array_column($items, 'variante_id')));
            sort($variantes);
            foreach ($variantes as $varianteId) {
                $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, $sucursalId, 'entrada', 1, 'ajuste', $usuario->id));
            }

            return $this->service->cancelarConStocks($bloqueado, $dto->motivo, $usuario, $stocks);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
