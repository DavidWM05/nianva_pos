<?php

declare(strict_types=1);

namespace App\OpenApi;

use App\Modules\Nucleo\Models\Concerns\SerializaDecimales;
use App\Modules\Nucleo\Support\FormatoDecimal;
use Dedoc\Scramble\Support\Generator\Types\ObjectType as EsquemaObjeto;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Dedoc\Scramble\Support\Generator\Types\Type as Esquema;
use Dedoc\Scramble\Support\Type\ObjectType;
use Dedoc\Scramble\Support\Type\Type;
use Dedoc\Scramble\Support\TypeToSchemaExtensions\ArrayableToSchema;
use Illuminate\Database\Eloquent\Model;

final class EsquemaModeloDecimal extends ArrayableToSchema
{
    public function shouldHandle(Type $type): bool
    {
        return $type instanceof ObjectType && $type->isInstanceOf(Model::class) && parent::shouldHandle($type);
    }

    public function toSchema(Type $type): Esquema
    {
        $esquema = parent::toSchema($type);
        if (! $esquema instanceof EsquemaObjeto) {
            return $esquema;
        }
        $modelo = new $type->name;
        if (! $modelo instanceof Model) {
            throw new \LogicException('Se esperaba un modelo Eloquent.');
        }
        $serializa = in_array(SerializaDecimales::class, class_uses_recursive($modelo), true);
        foreach ($modelo->getCasts() as $campo => $cast) {
            if (! $serializa && ! str_starts_with($cast, 'decimal:')) {
                continue;
            }
            $propiedad = $esquema->properties[$campo] ?? null;
            if ($propiedad === null) {
                continue;
            }
            $formato = FormatoDecimal::desdeCast($cast);
            if ($formato !== null) {
                $decimal = $propiedad instanceof StringType ? clone $propiedad : new StringType;
                $decimal->nullable = $propiedad->nullable;
                $decimal->pattern = $formato->patron();
                $esquema->properties[$campo] = $decimal;
            }
        }

        return $esquema;
    }
}
