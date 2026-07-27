<?php

namespace App\Modules\Nucleo\Console\Commands;

use App\Modules\Nucleo\Exceptions\LicenciaActivacionFallidaException;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\LicenciaClienteService;
use Illuminate\Console\Command;

/**
 * Primera activacion de un tenant contra el servidor central de licencias
 * (crea la fila de licencia_local si no existe) -- tambien sirve para
 * reactivar manualmente un tenant existente. A diferencia de
 * licencia:revalidar, esta SIEMPRE exige contacto exitoso con el servidor
 * -- ver LicenciaClienteService::activar().
 */
class ActivarLicenciaCommand extends Command
{
    protected $signature = 'licencia:activar {tenant_id : ID del tenant a activar}';

    protected $description = 'Activa (o reactiva) la licencia de un tenant contra el servidor central de licencias.';

    public function handle(LicenciaClienteService $licenciaClienteService): int
    {
        $tenant = Tenant::query()->find((int) $this->argument('tenant_id'));

        if ($tenant === null) {
            $this->error("No existe un tenant con id {$this->argument('tenant_id')}.");

            return self::FAILURE;
        }

        try {
            $licencia = $licenciaClienteService->activar($tenant);
        } catch (LicenciaActivacionFallidaException $e) {
            $this->error("No se pudo activar la licencia del tenant {$tenant->id}: {$e->getMessage()}");

            return self::FAILURE;
        }

        $expiracion = $licencia->fecha_expiracion?->toDateString() ?? 'sin vencimiento (perpetua)';
        $this->info("Licencia activada para el tenant {$tenant->id}. Estado: {$licencia->estado}. Expira: {$expiracion}.");

        return self::SUCCESS;
    }
}
