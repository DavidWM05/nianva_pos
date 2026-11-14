<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Support\Dinero;
use InvalidArgumentException;
use OverflowException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DineroTest extends TestCase
{
    #[DataProvider('importes')]
    public function test_convierte_y_redondea_mitad_hacia_arriba(string $importe, string $esperado): void
    {
        $this->assertSame($esperado, Dinero::desde($importe)->aCadena());
        $this->assertSame($esperado, Dinero::redondear($importe)->aCadena());
    }

    public static function importes(): array
    {
        return [
            ['0', '0.00'], ['001.2', '1.20'], ['1.0049', '1.00'],
            ['1.005', '1.01'], ['-1.005', '-1.01'], ['-0.004', '0.00'],
            ['9999999999.99', '9999999999.99'],
            ['92233720368547758.07', '92233720368547758.07'],
            ['-92233720368547758.08', '-92233720368547758.08'],
        ];
    }

    #[DataProvider('lineas')]
    public function test_paridad_por_linea_con_cantidades_decimales(string $precio, string $cantidad, string $esperado): void
    {
        $this->assertSame($esperado, Dinero::desdeProducto($precio, $cantidad)->aCadena());
    }

    public static function lineas(): array
    {
        return [
            'Lite 3 por 33.335 redondea la linea' => ['33.335', '3', '100.01'],
            'granel no redondea cada fraccion' => ['3', '33.335', '100.01'],
            'cantidad decimal' => ['12.35', '0.125', '1.54'],
            'cantidad negativa' => ['1.25', '-0.5', '-0.63'],
            'cero' => ['99.99', '0', '0.00'],
            'intermedio mayor que PHP_INT_MAX' => ['9999999999.99', '0.9999999999', '9999999998.99'],
        ];
    }

    #[DataProvider('porcentajes')]
    public function test_descuentos_de_porcentaje_exactos(string $base, string $tasa, string $esperado): void
    {
        $this->assertSame($esperado, Dinero::porcentajeDe($base, $tasa)->aCadena());
    }

    public static function porcentajes(): array
    {
        return [
            ['0.05', '10', '0.01'], ['0.15', '10', '0.02'],
            ['100', '12.3456', '12.35'], ['19.99', '12.5', '2.50'],
            ['1.005', '50', '0.50'], ['-0.05', '10', '-0.01'],
            ['9999999999.99', '99.9999', '9999989999.99'],
        ];
    }

    public function test_suma_resta_compara_y_conserva_la_inmutabilidad(): void
    {
        $base = Dinero::desde('10.05');
        $otro = Dinero::desde('2.10');
        $this->assertSame('12.15', $base->sumar($otro)->aCadena());
        $this->assertSame('7.95', $base->restar($otro)->aCadena());
        $this->assertSame('5.03', $base->multiplicar('0.5')->aCadena());
        $this->assertSame('1.01', $base->porcentaje('10')->aCadena());
        $this->assertSame(1, $base->comparar($otro));
        $this->assertSame(-1, $otro->comparar($base));
        $this->assertSame(0, $base->comparar(Dinero::desde('10.05')));
        $this->assertSame('10.05', $base->aCadena());
        $this->assertSame(1005, $base->centavos);
        $this->assertTrue((new \ReflectionClass(Dinero::class))->isReadOnly());
    }

    public function test_nxm_y_suma_de_lineas_ya_redondeadas(): void
    {
        $precio = Dinero::desde('33.33');
        $descuento = $precio->multiplicar(2);
        $this->assertSame('166.65', $precio->multiplicar(7)->restar($descuento)->aCadena());
        $linea = Dinero::desdeProducto('3', '33.335');
        $this->assertSame('200.02', $linea->sumar($linea)->aCadena());
        $this->assertSame('-0.01', Dinero::desdeResta('0.005', '0.01')->aCadena());
    }

    #[DataProvider('invalidos')]
    public function test_rechaza_importes_invalidos(string $importe): void
    {
        $this->expectException(InvalidArgumentException::class);
        Dinero::desde($importe);
    }

    public static function invalidos(): array
    {
        return [[''], ['1,25'], ['NaN'], ['--1'], ['1.2.3']];
    }

    public function test_detecta_overflow_sin_convertir_a_float(): void
    {
        $this->expectException(OverflowException::class);
        Dinero::desde('92233720368547758.08');
    }

    public function test_detecta_overflow_en_suma(): void
    {
        $this->expectException(OverflowException::class);
        Dinero::desde('92233720368547758.07')->sumar(Dinero::desde('0.01'));
    }

    public function test_detecta_overflow_en_resta(): void
    {
        $this->expectException(OverflowException::class);
        Dinero::desde('-92233720368547758.08')->restar(Dinero::desde('0.01'));
    }
}
