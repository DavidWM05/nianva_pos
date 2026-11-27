<?php

declare(strict_types=1);

namespace App\Aplicacion\Planes;

use App\Modules\Nucleo\Dtos\GuardarTerminalDto;
use App\Modules\Nucleo\Models\Terminal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class CatalogoTerminales
{
    public function __construct(private readonly CuotasPlan $cuotas) {}

    /** @return Builder<Terminal> */
    public function consulta(): Builder
    {
        return Terminal::query();
    }

    public function crear(int $tenantId, GuardarTerminalDto $datos): Terminal
    {
        return DB::transaction(function () use ($tenantId, $datos): Terminal {
            $this->cuotas->bloquear($tenantId);
            $activo = $datos->activo ?? true;
            if ($activo) {
                $this->cuotas->exigir($tenantId, 'terminales', 'alta');
            }

            return $this->consulta()->create([
                'tenant_id' => $tenantId,
                'sucursal_id' => $datos->sucursalId,
                'nombre' => $datos->nombre,
                'activo' => $activo,
            ]);
        });
    }
}
