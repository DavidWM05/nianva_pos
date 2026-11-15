<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Casts\CantidadDecimal;
use App\Modules\Nucleo\Casts\CantidadFormateada;
use App\Modules\Nucleo\Casts\CantidadFormateadaNullable;
use App\Modules\Nucleo\Models\Concerns\SerializaDecimales;
use App\Modules\Prestamos\Models\PrestamoPago;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\RecetaIngrediente;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoClienteCuota;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SerializacionPorCastTest extends TestCase
{
    use RefreshDatabase;

    public static function atributos(): array
    {
        return [
            'costo unitario D4' => ['costo_unitario', 'decimal:4', '0.0035', '0.0035'],
            'conteo entero' => ['total_algo', 'integer', 7, 7],
            'dinero sin prefijo' => ['importe', 'decimal:2', '12.3', '12.30'],
            'cantidad sin prefijo' => ['volumen', CantidadDecimal::class, '0.500', '0.500'],
            'decimal D3' => ['medida', 'decimal:3', '0.5', '0.500'],
            'cantidad con formato legado' => ['medida', CantidadFormateada::class.':4', '0.5', '0.500'],
            'cantidad nullable legado' => ['medida', CantidadFormateadaNullable::class.':2', '0.5', '0.500'],
            'valor null' => ['importe', 'decimal:2', null, null],
            'texto con prefijo' => ['cantidad_descripcion', 'string', 'sin medir', 'sin medir'],
        ];
    }

    #[DataProvider('atributos')]
    public function test_el_cast_decide_el_formato_y_conserva_los_otros_atributos(string $campo, string $cast, mixed $valor, mixed $esperado): void
    {
        $modelo = new class extends Model
        {
            use SerializaDecimales;
        };
        $modelo->mergeCasts([$campo => $cast]);
        $modelo->setRawAttributes([$campo => $valor]);
        $this->assertSame($esperado, $modelo->toArray()[$campo]);
    }

    public static function modelos(): array
    {
        return [
            [AbonoCuenta::class, ['monto' => '12.30']],
            [AbonoPagar::class, ['monto' => '12.30']],
            [NotaCreditoUso::class, ['monto_usado' => '12.30']],
            [InsumoStock::class, ['cantidad' => '0.500']],
            [RecetaIngrediente::class, ['cantidad' => '0.500']],
            [PlanPagoCliente::class, ['monto_total' => '12.30', 'interes_total' => '0.40', 'tasa_interes' => '2.50']],
            [PlanPagoClienteCuota::class, ['monto' => '12.30', 'monto_capital' => '10.00', 'monto_interes' => '2.30']],
            [PrestamoPago::class, ['monto' => '12.30']],
        ];
    }

    #[DataProvider('modelos')]
    public function test_los_ocho_modelos_conservan_su_salida_decimal(string $clase, array $esperado): void
    {
        $modelo = $clase::factory()->make($esperado);
        $this->assertSame($esperado, array_intersect_key($modelo->toArray(), $esperado));
    }
}
