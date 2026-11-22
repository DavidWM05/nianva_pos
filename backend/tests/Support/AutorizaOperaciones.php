<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\HuellaSupervisor;
use Illuminate\Support\Facades\DB;

trait AutorizaOperaciones
{
    /**
     * Prepara un token para pruebas de la operación. Las pruebas de emisión usan POST /autorizaciones.
     *
     * @param  array<string, mixed>  $cuerpo
     */
    public static function conSupervisor(
        Usuario $solicitante,
        AccionSupervisor $accion,
        array $cuerpo,
        ?string $recurso = null,
        ?int $sucursalId = null,
    ): OperacionSupervisorDto {
        $token = bin2hex(random_bytes(32));
        $huella = HuellaSupervisor::de($cuerpo);
        DB::table('autorizaciones_supervisor')->insert([
            'tenant_id' => $solicitante->getAttribute('tenant_id'),
            'sucursal_id' => $sucursalId ?? $solicitante->getAttribute('sucursal_id'),
            'solicitante_id' => $solicitante->id,
            'supervisor_id' => $solicitante->id,
            'token_hash' => hash('sha256', $token),
            'accion' => $accion->value,
            'recurso' => $recurso === null ? null : strtolower($recurso),
            'huella' => $huella,
            'vence_en' => now()->addMinutes(2),
        ]);

        return new OperacionSupervisorDto($solicitante, $token, $huella, null);
    }
}
