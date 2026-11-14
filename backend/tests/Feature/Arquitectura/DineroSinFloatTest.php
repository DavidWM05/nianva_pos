<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Support\Dinero;
use ReflectionClass;
use Tests\TestCase;

class DineroSinFloatTest extends TestCase
{
    public function test_el_value_object_no_usa_float_ni_redondeo_binario(): void
    {
        $codigo = file_get_contents((new ReflectionClass(Dinero::class))->getFileName());
        $prohibidos = [];
        foreach (token_get_all($codigo) as $token) {
            if (is_array($token)) {
                if (in_array($token[0], [T_DNUMBER, T_DOUBLE_CAST, T_POW], true)
                    || ($token[0] === T_STRING && in_array(strtolower($token[1]), ['float', 'floatval', 'round', 'floor', 'ceil', 'pow', 'fdiv'], true))) {
                    $prohibidos[] = $token[1].' en línea '.$token[2];
                }
            } elseif ($token === '/') {
                $prohibidos[] = 'División que produce punto flotante';
            }
        }
        $this->assertSame([], $prohibidos);
    }
}
