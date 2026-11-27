<?php

declare(strict_types=1);

namespace App\Aplicacion\Gastos;

use App\Aplicacion\Caja\CajaDeTerminal;
use App\Modules\Gastos\Dtos\CrearGastoDto;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Gastos\Services\GastoService;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Services\LibroCaja;
use Illuminate\Support\Facades\DB;

final class RegistrarGasto
{
    public function __construct(private readonly GastoService $service, private readonly LibroCaja $libroCaja) {}

    /** Usa la caja del contexto y participa de la transacción de la Action llamadora. */
    public function ejecutar(CrearGastoDto $dto, Usuario $usuario, ?Terminal $terminal = null): Gasto
    {
        $operacion = function () use ($dto, $usuario, $terminal): Gasto {
            $sucursalId = (int) $usuario->getAttribute('sucursal_id');
            $caja = CajaDeTerminal::bloquearAbierta($usuario, $terminal);

            $gasto = $this->service->registrarGastoConCaja($caja, $sucursalId, $usuario->id, $dto->descripcion, $dto->monto);
            // DAT-04: el gasto sale de la caja en su libro. La orquestación vive aquí porque Gastos
            // solo puede usar modelos y excepciones de Tpv, nunca sus servicios.
            if ($caja !== null) {
                $this->libroCaja->registrar($caja, 'gasto', Dinero::desde('0')->restar(Dinero::desde((string) $gasto->getAttribute('monto')))->aCadena(), 'gastos', (int) $gasto->getKey(), (int) $usuario->id, MetodoEfectivo::id());
            }

            return $gasto;
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
