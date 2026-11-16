<?php

declare(strict_types=1);

namespace App\OpenApi;

use Dedoc\Scramble\Contracts\RuleTransformer;
use Dedoc\Scramble\Support\Generator\Types\Type;
use Dedoc\Scramble\Support\RuleTransforming\NormalizedRule;
use Dedoc\Scramble\Support\RuleTransforming\RuleTransformerContext;

/**
 * UI-11b: `decimal:min,max` en un FormRequest documenta su maximo de decimales en el contrato
 * (`multipleOf`), para que el frontend no escriba los decimales a mano. Sin esta extension,
 * Scramble lo deja como un `number` sin limite.
 */
final class ReglaDecimal implements RuleTransformer
{
    public function shouldHandle(NormalizedRule $rule): bool
    {
        return $rule->is('decimal');
    }

    public function toSchema(Type $previous, NormalizedRule $rule, RuleTransformerContext $context): Type
    {
        $parametros = $rule->getParameters();
        $maximo = $parametros[1] ?? $parametros[0] ?? null;
        if (! is_numeric($maximo)) {
            return $previous;
        }

        return (new NumeroDecimal((int) $maximo))->addProperties($previous);
    }
}
