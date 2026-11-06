<?php

declare(strict_types=1);

namespace App\Aplicacion\Apartados;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Apartados\Dtos\CrearApartadoDto;
use App\Modules\Apartados\Dtos\LineaApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Support\Facades\DB;

final class CrearApartado
{
    public function __construct(private readonly ApartadoService $service, private readonly RegistrarMovimiento $movimiento) {}

    /** Participa de la transacción exterior; sus locks viven hasta el commit del llamador. */
    public function ejecutar(CrearApartadoDto $dto, Usuario $usuario): Apartado
    {
        $operacion = function () use ($dto, $usuario): Apartado {
            $items = array_map(static fn (LineaApartadoDto $linea): array => ['variante_id' => $linea->varianteId, 'cantidad' => $linea->cantidad], $dto->items);
            $sucursalId = (int) $usuario->getAttribute('sucursal_id');
            $stocks = [];
            $variantes = array_values(array_unique(array_column($items, 'variante_id')));
            sort($variantes);
            foreach ($variantes as $varianteId) {
                $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, $sucursalId, 'entrada', 1, 'ajuste', $usuario->id));
            }

            return $this->service->crearApartadoConStocks([
                'tenant_id' => (int) $usuario->getAttribute('tenant_id'), 'sucursal_id' => $sucursalId,
                'usuario_id' => $usuario->id, 'cliente_id' => $dto->clienteId,
                'fecha_vencimiento' => $dto->fechaVencimiento, 'notas' => $dto->notas,
            ], $items, $stocks);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
