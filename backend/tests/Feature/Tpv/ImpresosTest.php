<?php

declare(strict_types=1);

namespace Tests\Feature\Tpv;

use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Models\CajaCierreMetodo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class ImpresosTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_imprime_venta_sombra_con_folio_y_precios_guardados_sin_permiso_de_configuracion(): void
    {
        $this->prepararNegocio(['ventas.ver']);
        $venta = $this->crearVenta();
        $venta->update(['folio' => 'V-1-7', 'es_venta_sombra' => true]);
        $linea = $venta->detalles()->firstOrFail();
        $this->variante->producto->update(['precio_venta' => '999.00']);
        ConfiguracionTenant::actual()->update(['mensaje_ticket' => 'Gracias por su compra']);
        $this->actingAs($this->usuario)->getJson("/api/v1/ventas/{$venta->ulid}/impreso")
            ->assertOk()
            ->assertJsonPath('data.encabezado.folio', 'V-1-7')
            ->assertJsonPath('data.encabezado.sucursal', $this->sucursal->nombre)
            ->assertJsonPath('data.lineas.0.precio_unitario', (string) $linea->precio_unitario)
            ->assertJsonPath('data.totales.total', (string) $venta->total)
            ->assertJsonPath('data.pie.mensaje_ticket', 'Gracias por su compra');
    }

    public function test_corte_y_abono_muestran_las_cifras_guardadas(): void
    {
        $this->prepararNegocio(['caja.ver', 'apartados.ver', 'apartados.abonar']);
        $this->actingAs($this->usuario);
        $apartado = $this->crearApartado();
        $apartado->update(['folio' => 'A-1-4', 'total' => '100.00', 'total_abonado' => '0.00']);
        $datos = ['monto' => 25, 'pagos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 25]]];
        $this->postJson("/api/v1/apartados/{$apartado->ulid}/abonos", $datos)->assertOk();
        $abono = $apartado->abonos()->firstOrFail();
        $this->postJson("/api/v1/apartados/{$apartado->ulid}/abonos", $datos)->assertOk();
        $this->getJson("/api/v1/apartados/{$apartado->ulid}/abonos/{$abono->ulid}/impreso")
            ->assertOk()->assertJsonPath('data.encabezado.folio', 'A-1-4')
            ->assertJsonPath('data.totales.abono', '25.00')
            ->assertJsonPath('data.totales.saldo_anterior', '100.00')
            ->assertJsonPath('data.totales.saldo_nuevo', '75.00')
            ->assertJsonPath('data.pagos.0.monto', '25.00');
        $otroApartado = $this->crearApartado();
        $this->getJson("/api/v1/apartados/{$otroApartado->ulid}/abonos/{$abono->ulid}/impreso")->assertNotFound();

        $this->caja->update(['folio' => 'C-1-3', 'estado' => 'cerrada', 'fecha_cierre' => now(), 'total_teorico' => '55.00', 'monto_cierre' => '50.00', 'diferencia' => '-5.00']);
        CajaCierreMetodo::factory()->create(['caja_sesion_id' => $this->caja->id, 'total_teorico' => '55.00', 'monto_contado' => '50.00', 'diferencia' => '-5.00']);
        $this->getJson("/api/v1/caja/{$this->caja->ulid}/impreso")
            ->assertOk()
            ->assertJsonPath('data.encabezado.folio', 'C-1-3')
            ->assertJsonPath('data.lineas.0.total_teorico', '55.00')
            ->assertJsonPath('data.lineas.0.monto_contado', '50.00')
            ->assertJsonPath('data.lineas.0.diferencia', '-5.00');
    }

    public function test_el_corte_identifica_al_usuario_que_cerro_la_caja(): void
    {
        $this->prepararNegocio(['caja.ver', 'caja.cerrar']);
        $otroCajero = Usuario::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id]);
        $this->caja->update(['usuario_id' => $otroCajero->id]);
        $this->actingAs($this->usuario)
            ->patchJson("/api/v1/caja/{$this->caja->ulid}/cerrar", [
                'conteos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 500]],
            ])->assertOk();
        $this->getJson("/api/v1/caja/{$this->caja->ulid}/impreso")
            ->assertOk()->assertJsonPath('data.encabezado.usuario', $this->usuario->getAttribute('nombre'));
    }

    public function test_rechaza_otro_tenant_otra_sucursal_y_usuario_sin_permiso(): void
    {
        $this->prepararNegocio(['ventas.ver', 'caja.ver', 'apartados.ver']);
        $venta = $this->crearVenta();
        $apartado = $this->crearApartado();
        $abono = ApartadoAbono::factory()->create(['apartado_id' => $apartado->id, 'usuario_id' => $this->usuario->id]);
        $this->caja->update(['estado' => 'cerrada', 'fecha_cierre' => now()]);
        $rutas = ["/api/v1/ventas/{$venta->ulid}/impreso", "/api/v1/caja/{$this->caja->ulid}/impreso", "/api/v1/apartados/{$apartado->ulid}/abonos/{$abono->ulid}/impreso"];
        $this->darPermisosA($this->usuarioB, ['ventas.ver', 'caja.ver', 'apartados.ver']);
        $this->actingAs($this->usuarioB);
        foreach ($rutas as $ruta) {
            $this->getJson($ruta)->assertNotFound();
        }

        $otraSucursal = Sucursal::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->usuario->update(['sucursal_id' => $otraSucursal->id]);
        $this->actingAs($this->usuario);
        foreach ($rutas as $ruta) {
            $this->getJson($ruta)->assertNotFound();
        }

        $this->darPermisosA($this->usuario, ['sucursales.todas']);
        foreach ($rutas as $ruta) {
            $this->getJson($ruta)->assertOk()->assertJsonPath('data.encabezado.sucursal', $this->sucursal->nombre);
        }

        $this->usuario->update(['sucursal_id' => $this->sucursal->id]);
        $this->usuario->roles()->detach();
        foreach ($rutas as $ruta) {
            $this->getJson($ruta)->assertForbidden();
        }
    }
}
