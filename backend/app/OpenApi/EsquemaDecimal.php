<?php

declare(strict_types=1);

namespace App\OpenApi;

use Dedoc\Scramble\Extensions\TypeToSchemaExtension;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Dedoc\Scramble\Support\Type\Type;

final class EsquemaDecimal extends TypeToSchemaExtension
{
    public function shouldHandle(Type $type): bool
    {
        return $type instanceof TipoDecimal;
    }

    public function toSchema(Type $type): StringType
    {
        if (! $type instanceof TipoDecimal) {
            throw new \LogicException('EsquemaDecimal solo admite decimales serializados.');
        }
        $schema = new StringType;
        $schema->pattern = $type->patron;

        return $schema;
    }
}
