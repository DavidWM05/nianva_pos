<?php

declare(strict_types=1);

namespace App\OpenApi;

use App\Modules\Nucleo\Support\DecimalApi;
use Dedoc\Scramble\Infer\Extensions\Event\StaticMethodCallEvent;
use Dedoc\Scramble\Infer\Extensions\StaticMethodReturnTypeExtension;
use Dedoc\Scramble\Support\Type\Type;

final class InferirDecimal implements StaticMethodReturnTypeExtension
{
    public function shouldHandle(string $name): bool
    {
        return $name === DecimalApi::class;
    }

    public function getStaticMethodReturnType(StaticMethodCallEvent $event): ?Type
    {
        return match ($event->name) {
            'dinero' => new TipoDecimal(DecimalApi::PATRON_DINERO),
            'costoUnitario' => new TipoDecimal(DecimalApi::PATRON_CUATRO_DECIMALES),
            'cantidad' => new TipoDecimal(DecimalApi::PATRON_CANTIDAD),
            'tasa' => new TipoDecimal(DecimalApi::PATRON_CUATRO_DECIMALES),
            default => null,
        };
    }
}
