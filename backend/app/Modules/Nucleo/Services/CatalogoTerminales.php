<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

use App\Modules\Nucleo\Dtos\GuardarTerminalDto;
use App\Modules\Nucleo\Models\Terminal;
use Illuminate\Database\Eloquent\Builder;

final class CatalogoTerminales
{
    /** @return Builder<Terminal> */
    public function consulta(): Builder
    {
        return Terminal::query();
    }

    public function crear(int $tenantId, GuardarTerminalDto $datos): Terminal
    {
        return $this->consulta()->create([
            'tenant_id' => $tenantId,
            'sucursal_id' => $datos->sucursalId,
            'nombre' => $datos->nombre,
        ]);
    }
}
