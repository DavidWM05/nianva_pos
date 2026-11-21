<?php

declare(strict_types=1);

namespace App\OpenApi;

use App\Aplicacion\Idempotencia\Idempotencia;
use Dedoc\Scramble\Contracts\OperationTransformer;
use Dedoc\Scramble\Support\Generator\Operation;
use Dedoc\Scramble\Support\Generator\Parameter;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Dedoc\Scramble\Support\RouteInfo;

final class CabeceraIdempotencia implements OperationTransformer
{
    public function handle(Operation $operation, RouteInfo $routeInfo): void
    {
        if (! in_array(Idempotencia::class, $routeInfo->route->gatherMiddleware(), true)) {
            return;
        }

        $cabecera = Parameter::make('Idempotency-Key', 'header')
            ->setSchema(Schema::fromType(new StringType))
            ->description('ULID opcional. Repetir la misma operación conserva la respuesta durante 24 horas. Una carga diferente con la misma llave devuelve 409.');

        $operation->addParameters([$cabecera]);
    }
}
