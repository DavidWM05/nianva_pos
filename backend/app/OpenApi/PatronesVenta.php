<?php

declare(strict_types=1);

namespace App\OpenApi;

use App\Modules\Nucleo\Support\DecimalApi;
use Dedoc\Scramble\Contracts\DocumentTransformer;
use Dedoc\Scramble\OpenApiContext;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\ObjectType;
use Dedoc\Scramble\Support\Generator\Types\StringType;

final class PatronesVenta implements DocumentTransformer
{
    public function handle(OpenApi $document, OpenApiContext $context): void
    {
        $schema = $document->components->schemas['Venta'] ?? null;
        if (! $schema instanceof Schema || ! $schema->type instanceof ObjectType) {
            return;
        }
        foreach (['total', 'descuento_cupon', 'descuento_manual', 'abono_previo'] as $campo) {
            $propiedad = $schema->type->properties[$campo] ?? null;
            if ($propiedad instanceof StringType) {
                $propiedad->pattern = DecimalApi::PATRON_DINERO;
            }
        }
    }
}
