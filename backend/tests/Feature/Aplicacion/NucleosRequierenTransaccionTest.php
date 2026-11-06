<?php

declare(strict_types=1);

namespace Tests\Feature\Aplicacion;

use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use LogicException;
use Tests\TestCase;

/** Sin RefreshDatabase: aquí no debe existir una transacción de fixtures. */
class NucleosRequierenTransaccionTest extends TestCase
{
    public function test_movimiento_rechaza_escribir_sin_transaccion(): void
    {
        $this->expectException(LogicException::class);
        app(InventarioService::class)->registrarMovimientoConStock(new InventarioStock, 'entrada', 1, 'ajuste', 1);
    }

    public function test_compra_rechaza_escribir_sin_transaccion(): void
    {
        $this->expectException(LogicException::class);
        app(InventarioService::class)->registrarCompraConStocks(['tenant_id' => 1, 'proveedor_id' => 1, 'sucursal_id' => 1, 'usuario_id' => 1], [], []);
    }

    public function test_venta_rechaza_escribir_sin_transaccion(): void
    {
        $this->expectException(LogicException::class);
        app(VentaService::class)->registrarVentaConBloqueos(['tenant_id' => 1, 'sucursal_id' => 1, 'usuario_id' => 1, 'cliente_id' => 1], [], [], null, []);
    }

    public function test_anulacion_rechaza_escribir_sin_transaccion(): void
    {
        $this->expectException(LogicException::class);
        app(VentaService::class)->anularVentaConStocks(new Venta, 'Motivo', new Usuario, []);
    }

    public function test_apertura_rechaza_escribir_sin_transaccion(): void
    {
        $this->expectException(LogicException::class);
        app(CajaService::class)->abrirCajaConSucursal(new Sucursal, 1, 50);
    }

    public function test_cierre_rechaza_escribir_sin_transaccion(): void
    {
        $this->expectException(LogicException::class);
        app(CajaService::class)->cerrarCajaConSesion(new CajaSesion, 50);
    }
}
