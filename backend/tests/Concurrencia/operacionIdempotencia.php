<?php

declare(strict_types=1);

use App\Aplicacion\Idempotencia\Idempotencia;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\JsonResponse;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

[$usuarioId, $llave, $canal] = array_slice($argv, 1);
$usuario = Usuario::query()->withoutGlobalScopes()->findOrFail((int) $usuarioId);
$solicitud = Request::create('/api/v1/ventas', 'POST', ['total' => 100]);
$solicitud->setUserResolver(static fn (): Usuario => $usuario);
$solicitud->headers->set('Idempotency-Key', $llave);
file_put_contents($canal, (string) DB::selectOne('SELECT CONNECTION_ID() AS id')->id, LOCK_EX);
$respuesta = app(Idempotencia::class)->handle(
    $solicitud,
    static fn (): JsonResponse => new JsonResponse(['ejecucion' => 'hijo'], 201),
);

echo $respuesta->getContent();
