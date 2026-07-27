<?php

namespace App\Modules\Nucleo\Console\Commands;

use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Services\LicenciaClienteService;
use Illuminate\Console\Command;

/**
 * Revalida CADA tenant que ya tiene una fila en licencia_local (nunca crea
 * una nueva -- eso es trabajo de licencia:activar). Pensado para el
 * scheduler de Laravel (ver routes/console.php), nunca on-request: el
 * sistema PHP viejo de POS Ropa validaba la licencia en cada request al
 * servidor central, lo que significaba que una caida de ese servidor
 * tumbaba el POS de todos sus clientes al mismo tiempo. Aqui la
 * revalidacion es un proceso de fondo independiente; si falla, cada tenant
 * sigue operando con su ultimo estado conocido durante el periodo de
 * gracia (ver LicenciaClienteService::revalidar()).
 *
 * Un tenant que falla no detiene a los demas -- se seguiria revalidando
 * uno por uno aunque el primero lance una excepcion inesperada.
 */
class RevalidarLicenciasCommand extends Command
{
    protected $signature = 'licencia:revalidar';

    protected $description = 'Revalida contra el servidor central de licencias cada tenant con una licencia_local existente.';

    public function handle(LicenciaClienteService $licenciaClienteService): int
    {
        $licencias = LicenciaLocal::query()->get();
        $fallidos = 0;

        foreach ($licencias as $licenciaLocal) {
            try {
                $licenciaClienteService->revalidar($licenciaLocal);
            } catch (\Throwable $e) {
                $fallidos++;
                $this->error("Tenant {$licenciaLocal->tenant_id}: error inesperado revalidando -- {$e->getMessage()}");

                continue;
            }
        }

        $this->info(sprintf(
            'Revalidadas %d licencias (%d con error inesperado).',
            $licencias->count(),
            $fallidos,
        ));

        return $fallidos === 0 ? self::SUCCESS : self::FAILURE;
    }
}
