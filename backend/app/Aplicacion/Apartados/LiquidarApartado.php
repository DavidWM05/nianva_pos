<?php

declare(strict_types=1);

namespace App\Aplicacion\Apartados;

use App\Aplicacion\Caja\CajaDeTerminal;
use App\Aplicacion\Folios\Folios;
use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Apartados\Dtos\LiquidarApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Support\Facades\DB;

final class LiquidarApartado
{
    public function __construct(private readonly ApartadoService $service, private readonly RegistrarMovimiento $movimiento) {}

    /** Reutiliza la transacción exterior; bloquea el estado antes de modificar la reserva. */
    public function ejecutar(LiquidarApartadoDto $dto, Apartado $apartado, ?Usuario $usuario, ?Terminal $terminal = null): Apartado
    {
        if ($usuario === null) {
            abort(401);
        }
        $operacion = function () use ($apartado, $usuario, $terminal) {
            $caja = CajaDeTerminal::bloquearAbierta($usuario, $terminal);
            $bloqueado = Apartado::query()->whereKey($apartado->id)->lockForUpdate()->firstOrFail();
            if ((int) $bloqueado->getAttribute('sucursal_id') !== (int) $usuario->getAttribute('sucursal_id')) {
                $caja = null;
            }
            $sucursalId = (int) $bloqueado->getAttribute('sucursal_id');
            $items = $bloqueado->detalles->map(static fn ($detalle): array => ['variante_id' => (int) $detalle->getAttribute('variante_id')])->values()->all();
            $stocks = [];
            $variantes = array_values(array_unique(array_column($items, 'variante_id')));
            sort($variantes);
            foreach ($variantes as $varianteId) {
                $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, $sucursalId, 'entrada', 1, 'ajuste', $usuario->id));
            }

            return $this->service->liquidarConBloqueos($bloqueado, $usuario->id, $caja, $stocks, Folios::asignar((int) $bloqueado->getAttribute('tenant_id'), $sucursalId, 'V'));
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
