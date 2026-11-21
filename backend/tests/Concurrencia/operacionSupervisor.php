<?php

declare(strict_types=1);

use App\Aplicacion\Supervisor\Supervisor;
use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Exceptions\SupervisorInvalidoException;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\HuellaSupervisor;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

[$usuarioId, $token, $canal] = array_slice($argv, 1);
$usuario = Usuario::query()->withoutGlobalScopes()->findOrFail((int) $usuarioId);
file_put_contents($canal, (string) DB::selectOne('SELECT CONNECTION_ID() AS id')->id, LOCK_EX);

try {
    DB::transaction(static fn () => Supervisor::consumir(
        new OperacionSupervisorDto($usuario, $token, HuellaSupervisor::de([]), null),
        AccionSupervisor::DescuentoVenta,
    ));
    echo 'consumida';
} catch (SupervisorInvalidoException) {
    echo 'rechazada';
}
