<?php

declare(strict_types=1);

namespace App\Aplicacion\Produccion;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Produccion\Dtos\CrearTransformacionDto;
use App\Modules\Produccion\Models\TransformacionProducto;
use App\Modules\Produccion\Services\ProduccionService;
use Illuminate\Support\Facades\DB;

final class RegistrarTransformacion
{
    public function __construct(private readonly ProduccionService $service, private readonly RegistrarMovimiento $movimiento) {}

    public function ejecutar(CrearTransformacionDto $dto, Usuario $usuario): TransformacionProducto
    {
        $operacion = function () use ($dto, $usuario) {
            $sucursalId = (int) $usuario->getAttribute('sucursal_id');
            $variantes = array_values(array_unique([$dto->varianteOrigenId, $dto->varianteDestinoId]));
            sort($variantes);
            $stocks = [];
            foreach ($variantes as $id) {
                $stocks[$id] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($id, $sucursalId, 'entrada', 1, 'ajuste', $usuario->id));
            }
            $datos = $dto->datos();
            $datos['tenant_id'] = (int) $usuario->getAttribute('tenant_id');
            $datos['sucursal_id'] = $sucursalId;
            $datos['usuario_id'] = $usuario->id;

            return $this->service->registrarTransformacionConStocks($datos, $stocks[$dto->varianteOrigenId], $stocks[$dto->varianteDestinoId]);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
