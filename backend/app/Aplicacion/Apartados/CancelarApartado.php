<?php

declare(strict_types=1);

namespace App\Aplicacion\Apartados;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Aplicacion\Supervisor\Supervisor;
use App\Modules\Apartados\Dtos\CancelarApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Apartados\Support\ResultadoCancelacion;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\AccionSupervisor;
use Illuminate\Support\Facades\DB;

final class CancelarApartado
{
    public function __construct(private readonly ApartadoService $service, private readonly RegistrarMovimiento $movimiento) {}

    /** Reutiliza la transacción exterior; bloquea el estado antes de modificar la reserva. */
    public function ejecutar(CancelarApartadoDto $dto, Apartado $apartado, Usuario $usuario, ?OperacionSupervisorDto $autorizacion = null): ResultadoCancelacion
    {
        $operacion = function () use ($dto, $apartado, $usuario, $autorizacion) {
            $bloqueado = Apartado::query()->whereKey($apartado->id)->lockForUpdate()->firstOrFail();
            Supervisor::consumir($autorizacion, AccionSupervisor::CancelarApartado, (string) $bloqueado->getAttribute('ulid'), (int) $bloqueado->getAttribute('sucursal_id'));
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
