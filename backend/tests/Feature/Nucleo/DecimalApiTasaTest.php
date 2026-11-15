<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Support\DecimalApi;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * DAT-02b: las tasas (decimal(7,4)) salen en la API como cadena con 4 decimales, igual que el
 * dinero sale con 2 y las cantidades con 3. El patron es PATRON_CUATRO_DECIMALES, compartido
 * con el costo unitario de insumos (API-02b).
 */
class DecimalApiTasaTest extends TestCase
{
    /** @return array<string, array{string|int|float, string}> */
    public static function tasas(): array
    {
        return [
            'cero' => [0, '0.0000'],
            'entero' => [10, '10.0000'],
            'cien' => ['100', '100.0000'],
            'cadena corta' => ['12.5', '12.5000'],
            'cadena exacta' => ['12.3456', '12.3456'],
            'redondea hacia arriba en la quinta cifra' => ['12.34565', '12.3457'],
            'trunca bajo la mitad' => ['12.34564', '12.3456'],
            'acarreo hasta el entero' => ['9.99995', '10.0000'],
            'negativo' => ['-0.00005', '-0.0001'],
            'float sin ruido binario' => [0.1, '0.1000'],
            'float periodico' => [33.333333, '33.3333'],
            'cadena de la base decimal(7,4)' => ['7.5000', '7.5000'],
        ];
    }

    #[DataProvider('tasas')]
    public function test_serializa_la_tasa_con_cuatro_decimales(string|int|float $valor, string $esperado): void
    {
        $this->assertSame($esperado, DecimalApi::tasa($valor));
        $this->assertMatchesRegularExpression('/'.DecimalApi::PATRON_CUATRO_DECIMALES.'/', DecimalApi::tasa($valor));
    }

    public function test_el_patron_de_cuatro_decimales_es_el_acordado(): void
    {
        $this->assertSame('^-?[0-9]+\.[0-9]{4}$', DecimalApi::PATRON_CUATRO_DECIMALES);
    }

    public function test_rechaza_lo_que_no_es_decimal(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        DecimalApi::tasa('1,5');
    }
}
