<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class Nucleos04eRequierenTransaccionTest extends TestCase
{
    #[DataProvider('nucleos')]
    public function test_el_nucleo_exige_transaccion_antes_de_escribir(string $modulo, string $servicio, string $metodo, array $argumentos): void
    {
        $this->expectException(\LogicException::class);
        $this->expectExceptionMessage('requiere una transacción abierta por una Action.');
        $argumentos = array_map(static function ($valor) {
            if (is_string($valor) && str_starts_with($valor, '@')) {
                [$modulo, $modelo] = explode('/', substr($valor, 1));
                $clase = 'App\\Modules\\'.$modulo.'\\Models\\'.$modelo;

                return new $clase;
            }

            return $valor;
        }, $argumentos);
        $clase = 'App\\Modules\\'.$modulo.'\\Services\\'.$servicio;
        app($clase)->$metodo(...$argumentos);
    }

    public static function nucleos(): array
    {
        return [
            ['Cotizaciones', 'CotizacionService', 'crear', [[], []]],
            ['Cotizaciones', 'CotizacionService', 'actualizarConCotizacion', ['@Cotizaciones/Cotizacion', [], []]],
            ['Cotizaciones', 'CotizacionService', 'anularConCotizacion', ['@Cotizaciones/Cotizacion']],
            ['Cotizaciones', 'CotizacionService', 'convertirConBloqueos', ['@Cotizaciones/Cotizacion', [], null, []]],
            ['UnidadesMedida', 'UnidadMedidaService', 'crear', [[]]],
            ['UnidadesMedida', 'UnidadMedidaService', 'actualizarConUnidad', ['@UnidadesMedida/UnidadMedida', []]],
            ['UnidadesMedida', 'UnidadMedidaService', 'eliminarConUnidad', ['@UnidadesMedida/UnidadMedida']],
            ['Produccion', 'ProduccionService', 'crearReceta', [[]]],
            ['Produccion', 'ProduccionService', 'crearOrdenConReceta', [[], '@Produccion/Receta', []]],
            ['Produccion', 'ProduccionService', 'completarOrdenConBloqueos', ['@Produccion/OrdenProduccion', '@Produccion/Receta', [], '@Inventario/InventarioStock', 1]],
            ['Produccion', 'ProduccionService', 'registrarTransformacionConStocks', [[], '@Inventario/InventarioStock', '@Inventario/InventarioStock']],
            ['Produccion', 'ProduccionService', 'registrarEntradaInsumo', ['@Produccion/Insumo', null, 1, 1, null, null]],
            ['Produccion', 'ProduccionService', 'cambiarEstadoConOrden', ['@Produccion/OrdenProduccion', 'cancelada']],
        ];
    }

    public function test_las_firmas_y_helpers_de_transicion_fueron_retirados(): void
    {
        $retirados = [
            'Tpv/VentaService' => ['registrarVenta', 'enTransicion', 'bloquearTransicion'],
            'Tpv/CajaService' => ['abrirCaja', 'conModeloBloqueado'],
            'Inventario/InventarioService' => ['registrarMovimiento', 'registrarCompra', 'stocksParaTransicion'],
            'Apartados/ApartadoService' => ['crearApartado', 'registrarAbono', 'liquidar', 'cancelar', 'transicion', 'bloquear'],
        ];
        foreach ($retirados as $ruta => $metodos) {
            [$modulo, $servicio] = explode('/', $ruta);
            $clase = 'App\\Modules\\'.$modulo.'\\Services\\'.$servicio;
            foreach ($metodos as $metodo) {
                $this->assertFalse(method_exists($clase, $metodo), $clase.'::'.$metodo);
            }
        }
    }
}
