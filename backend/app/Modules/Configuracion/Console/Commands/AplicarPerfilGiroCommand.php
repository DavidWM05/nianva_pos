<?php

declare(strict_types=1);

namespace App\Modules\Configuracion\Console\Commands;

use App\Aplicacion\Configuracion\AplicarPerfilGiro;
use App\Modules\Configuracion\Support\PerfilesGiro;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Console\Command;

/** ARQ-07: aplica un perfil de giro a un tenant desde la consola (alta manual, soporte). */
class AplicarPerfilGiroCommand extends Command
{
    protected $signature = 'giro:aplicar {tenant : id del tenant} {perfil : clave del perfil de giro}';

    protected $description = 'Siembra en un tenant lo que falte de un perfil de giro y lo deja como su perfil';

    public function handle(AplicarPerfilGiro $aplicar): int
    {
        $tenantId = (int) $this->argument('tenant');
        $perfil = (string) $this->argument('perfil');

        if (Tenant::query()->whereKey($tenantId)->doesntExist()) {
            $this->error("No existe el tenant {$tenantId}.");

            return self::FAILURE;
        }
        if (! in_array($perfil, PerfilesGiro::claves(), true)) {
            $this->error("Perfil desconocido: {$perfil}. Disponibles: ".implode(', ', PerfilesGiro::claves()).'.');

            return self::FAILURE;
        }

        $creados = $aplicar->ejecutar($tenantId, $perfil);
        $this->info("Perfil {$perfil} aplicado al tenant {$tenantId}: {$creados['atributos']} atributos, {$creados['valores']} valores, {$creados['categorias']} categorias y {$creados['unidades']} unidades nuevas.");

        return self::SUCCESS;
    }
}
