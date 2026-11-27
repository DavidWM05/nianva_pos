<?php

declare(strict_types=1);

namespace App\Aplicacion\Caja;

use App\Aplicacion\Planes\CuotasPlan;
use App\Modules\Nucleo\Dtos\GuardarTerminalDto;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ModificarTerminal
{
    public function __construct(private readonly CuotasPlan $cuotas) {}

    public function ejecutar(Terminal $terminal, ?GuardarTerminalDto $datos): Terminal
    {
        return DB::transaction(function () use ($terminal, $datos): Terminal {
            $this->cuotas->bloquear($terminal->tenant_id);
            $terminal = Terminal::sinTenant()->whereKey($terminal->id)->lockForUpdate()->firstOrFail();
            $activo = $datos === null ? false : ($datos->activo ?? $terminal->activo);
            if (! $activo || $terminal->sucursal_id !== $datos->sucursalId) {
                $abierta = CajaSesion::sinTenant()->where('terminal_id', $terminal->id)->where('estado', 'abierta')->exists();
                if ($abierta) {
                    throw ValidationException::withMessages(['activo' => 'Primero cierra la caja de la terminal.']);
                }
            }

            if ($datos === null) {
                $terminal->delete();

                return $terminal;
            }

            if ($activo && ! $terminal->activo) {
                $this->cuotas->exigir($terminal->tenant_id, 'terminales', 'reactivacion');
            }

            $terminal->update(['nombre' => $datos->nombre, 'sucursal_id' => $datos->sucursalId, 'activo' => $activo]);

            return $terminal;
        });
    }
}
