<?php

declare(strict_types=1);

namespace App\OpenApi;

use App\Modules\Nucleo\Support\DecimalApi;
use Dedoc\Scramble\Contracts\OperationTransformer;
use Dedoc\Scramble\Support\Generator\Operation;
use Dedoc\Scramble\Support\Generator\Response;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\IntegerType;
use Dedoc\Scramble\Support\Generator\Types\ObjectType;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Dedoc\Scramble\Support\RouteInfo;

final class RentabilidadOpcional implements OperationTransformer
{
    public function handle(Operation $operation, RouteInfo $routeInfo): void
    {
        $campo = match ($routeInfo->route->uri()) {
            'api/v1/inicio/resumen' => 'rentabilidad_mes',
            'api/v1/ventas/reporte' => 'rentabilidad',
            default => null,
        };
        if ($campo === null) {
            return;
        }

        foreach ($operation->responses ?? [] as $respuesta) {
            if (! $respuesta instanceof Response || $respuesta->code !== 200) {
                continue;
            }

            $esquema = $respuesta->getContent('application/json');
            $tipo = $esquema instanceof Schema ? $esquema->type : null;
            $datos = $tipo instanceof ObjectType ? ($tipo->properties['data'] ?? null) : null;
            if (! $datos instanceof ObjectType || ! ($datos->properties[$campo] ?? null) instanceof ObjectType) {
                continue;
            }

            $rentabilidad = $datos->properties[$campo]->nullable($campo === 'rentabilidad_mes');
            $datos->setRequired(array_values(array_diff($datos->required, [$campo])));
            foreach ($rentabilidad->properties as $nombre => $propiedad) {
                if ($propiedad instanceof StringType) {
                    $propiedad->pattern(DecimalApi::PATRON_DINERO);
                }
                if ($nombre === 'lineas_sin_costo') {
                    $rentabilidad->addProperty($nombre, (new IntegerType)->setMin(0));
                }
            }
        }
    }
}
