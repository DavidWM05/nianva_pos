<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Devoluciones\Services\DevolucionService;
use App\Modules\Gastos\Services\GastoService;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class Nucleos04cRequierenTransaccionTest extends TestCase
{
    public static function operaciones(): array
    {
        return array_map(static fn (string $op): array => [$op], ['crear', 'abonar', 'liquidar', 'cancelar', 'devolver', 'gasto']);
    }

    #[DataProvider('operaciones')]
    public function test_el_nucleo_rechaza_escribir_sin_transaccion(string $op): void
    {
        $this->expectException(\LogicException::class);
        match ($op) {
            'crear' => app(ApartadoService::class)->crearApartadoConStocks([], [], []),
            'abonar' => app(ApartadoService::class)->registrarAbonoConApartado(new Apartado, 10, 1, []),
            'liquidar' => app(ApartadoService::class)->liquidarConBloqueos(new Apartado, 1, null, []),
            'cancelar' => app(ApartadoService::class)->cancelarConStocks(new Apartado, 'Motivo', new Usuario, []),
            'devolver' => app(DevolucionService::class)->registrarDevolucionConBloqueos(new Venta, 'devolucion', [], [], 1, 1, []),
            'gasto' => app(GastoService::class)->registrarGastoConCaja(null, 1, 1, 'Luz', 10),
        };
    }
}
