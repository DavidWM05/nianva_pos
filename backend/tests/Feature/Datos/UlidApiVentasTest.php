<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Tpv\Models\VentaDetalle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\AutorizaOperaciones;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * DAT-08 etapa 2: ventas, caja, apartados, devoluciones, notas de crédito y gift cards se
 * resuelven por ulid en la ruta y lo publican en `id` (D-4); `numero` es el transitorio de D-3. Las
 * entradas que reciben esos documentos aceptan el ulid y rechazan el id interno.
 */
class UlidApiVentasTest extends TestCase
{
    use AutorizaOperaciones;
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([
            'ventas.ver', 'ventas.anular', 'apartados.ver', 'apartados.abonar', 'devoluciones.ver',
            'devoluciones.crear', 'notas_credito.ver', 'gift_cards.ver', 'gift_cards.recargar',
            'gift_cards.cancelar', 'caja.ver', 'caja.cerrar', 'gastos.ver', 'auditoria.ver', 'ventas.crear',
        ]);
        $this->actingAs($this->usuario);
    }

    public function test_los_detalles_responden_por_ulid_y_no_por_id(): void
    {
        $venta = $this->crearVenta();
        $apartado = $this->crearApartado();
        $devolucion = Devolucion::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'venta_id' => $venta->id]);
        $nota = NotaCredito::factory()->create(['tenant_id' => $this->tenant->id, 'devolucion_id' => $devolucion->id, 'cliente_id' => $this->cliente->id]);
        $tarjeta = GiftCard::factory()->create(['tenant_id' => $this->tenant->id]);

        foreach ([
            'ventas' => $venta, 'apartados' => $apartado, 'devoluciones' => $devolucion,
            'notas-credito' => $nota, 'gift-cards' => $tarjeta,
        ] as $recurso => $modelo) {
            $respuesta = $this->getJson("/api/v1/{$recurso}/{$modelo->ulid}");
            $this->assertSame(200, $respuesta->status(), "{$recurso}: ".$respuesta->getContent());
            $this->assertSame($modelo->ulid, $respuesta->json('data.id'), $recurso);
            $this->getJson("/api/v1/{$recurso}/{$modelo->getKey()}")->assertNotFound();
        }
    }

    public function test_las_acciones_sobre_un_documento_exigen_el_ulid(): void
    {
        $venta = $this->crearVenta();
        $this->patchJson("/api/v1/ventas/{$venta->getKey()}/anular", ['motivo' => 'x'])->assertNotFound();
        $this->patchJson("/api/v1/caja/{$this->caja->getKey()}/cerrar", ['conteos' => []])->assertNotFound();

        $tarjeta = GiftCard::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->postJson("/api/v1/gift-cards/{$tarjeta->getKey()}/cancelar")->assertNotFound();
        $this->postJson("/api/v1/gift-cards/{$tarjeta->ulid}/cancelar")->assertOk();
        $this->assertSame('cancelada', $tarjeta->refresh()->estado);
    }

    public function test_un_ulid_de_otro_tenant_da_404(): void
    {
        $this->getJson("/api/v1/ventas/{$this->ventaB->ulid}")->assertNotFound();
        $this->getJson("/api/v1/notas-credito/{$this->notaCreditoB->ulid}")->assertNotFound();
    }

    public function test_los_resources_publican_el_ulid_y_el_numero_transitorio(): void
    {
        $venta = $this->crearVenta();
        $datos = $this->getJson("/api/v1/ventas/{$venta->ulid}")->assertOk()->json('data');

        $this->assertSame($venta->ulid, $datos['id']);
        $this->assertArrayNotHasKey('numero', $datos);
        $linea = VentaDetalle::query()->where('venta_id', $venta->id)->firstOrFail();
        $this->assertSame($linea->ulid, $datos['detalles'][0]['id']);

        $apartado = $this->crearApartado();
        $this->getJson("/api/v1/apartados/{$apartado->ulid}")
            ->assertJsonMissingPath('data.numero');
        $this->seleccionarTerminalDeCaja();
        $this->getJson('/api/v1/caja/actual')
            ->assertJsonPath('data.id', $this->caja->ulid)
            ->assertJsonMissingPath('data.numero');
    }

    public function test_las_referencias_publicadas_llevan_el_ulid_del_relacionado(): void
    {
        $venta = $this->crearVenta();
        $devolucion = Devolucion::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'venta_id' => $venta->id, 'venta_sombra_id' => $venta->id]);

        $this->getJson("/api/v1/devoluciones/{$devolucion->ulid}")
            ->assertOk()
            ->assertJsonPath('data.venta.id', $venta->ulid)
            ->assertJsonMissingPath('data.venta.numero')
            ->assertJsonPath('data.venta_sombra_id', $venta->ulid);

        $nota = NotaCredito::factory()->create(['tenant_id' => $this->tenant->id, 'cliente_id' => $this->cliente->id, 'devolucion_id' => $devolucion->id]);
        $this->getJson("/api/v1/notas-credito/{$nota->ulid}")->assertJsonPath('data.devolucion_id', $devolucion->ulid);

        $apartado = Apartado::query()->findOrFail($this->crearApartado()->getKey());
        $apartado->update(['venta_id' => $venta->id]);
        $this->getJson("/api/v1/apartados/{$apartado->ulid}")->assertJsonPath('data.venta_id', $venta->ulid);
    }

    public function test_la_devolucion_publica_el_numero_transitorio_de_su_venta_sombra(): void
    {
        $venta = $this->crearVenta();
        $sombra = $this->crearVenta();
        $conSombra = Devolucion::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'venta_id' => $venta->id, 'venta_sombra_id' => $sombra->id]);
        $sinSombra = Devolucion::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'venta_id' => $venta->id, 'venta_sombra_id' => null]);

        $this->getJson("/api/v1/devoluciones/{$conSombra->ulid}")
            ->assertJsonPath('data.venta_sombra_id', $sombra->ulid)
            ->assertJsonMissingPath('data.venta_sombra_numero');
        $this->getJson("/api/v1/devoluciones/{$sinSombra->ulid}")
            ->assertJsonPath('data.venta_sombra_id', null)
            ->assertJsonMissingPath('data.venta_sombra_numero');
        $this->getJson('/api/v1/devoluciones')
            ->assertOk()
            ->assertJsonMissingPath('data.0.venta_sombra_numero');
    }

    public function test_la_nota_publica_el_folio_de_su_devolucion(): void
    {
        $venta = $this->crearVenta();
        $folio = "D-{$this->sucursal->id}-1";
        $devolucion = Devolucion::factory()->create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'venta_id' => $venta->id,
            'folio' => $folio,
        ]);
        $nota = NotaCredito::factory()->create([
            'tenant_id' => $this->tenant->id,
            'devolucion_id' => $devolucion->id,
            'cliente_id' => $this->cliente->id,
        ]);

        $this->getJson("/api/v1/notas-credito/{$nota->ulid}")
            ->assertOk()->assertJsonPath('data.folio', $folio);
    }

    public function test_la_nota_publica_el_numero_transitorio_de_su_devolucion(): void
    {
        $devolucion = Devolucion::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'venta_id' => $this->crearVenta()->id]);
        $nota = NotaCredito::factory()->create(['tenant_id' => $this->tenant->id, 'cliente_id' => $this->cliente->id, 'devolucion_id' => $devolucion->id]);

        $this->getJson("/api/v1/notas-credito/{$nota->ulid}")
            ->assertOk()
            ->assertJsonPath('data.devolucion_id', $devolucion->ulid)
            ->assertJsonMissingPath('data.devolucion_numero');
        $this->getJson('/api/v1/notas-credito')
            ->assertOk()
            ->assertJsonMissingPath('data.0.devolucion_numero');
    }

    public function test_la_devolucion_recibe_la_venta_y_la_linea_por_ulid(): void
    {
        $venta = $this->crearVenta();
        $linea = VentaDetalle::query()->where('venta_id', $venta->id)->firstOrFail();
        $item = ['variante_id' => $this->variante->id, 'cantidad' => 1];

        $this->postJson('/api/v1/devoluciones', ['venta_id' => $venta->getKey(), 'tipo' => 'devolucion', 'items_devueltos' => [$item]])
            ->assertStatus(422)->assertJsonValidationErrors(['venta_id']);
        $this->postJson('/api/v1/devoluciones', ['venta_id' => $this->ventaB->ulid, 'tipo' => 'devolucion', 'items_devueltos' => [$item]])
            ->assertStatus(422)->assertJsonValidationErrors(['venta_id']);

        $otraVenta = $this->crearVenta();
        $lineaAjena = VentaDetalle::query()->where('venta_id', $otraVenta->id)->firstOrFail();
        $this->postJson('/api/v1/devoluciones', ['venta_id' => $venta->ulid, 'tipo' => 'devolucion', 'items_devueltos' => [$item + ['venta_detalle_id' => $lineaAjena->ulid]]])
            ->assertStatus(422)->assertJsonValidationErrors(['items_devueltos.0.venta_detalle_id']);
        $this->postJson('/api/v1/devoluciones', ['venta_id' => $venta->ulid, 'tipo' => 'devolucion', 'items_devueltos' => [$item + ['venta_detalle_id' => $linea->getKey()]]])
            ->assertStatus(422)->assertJsonValidationErrors(['items_devueltos.0.venta_detalle_id']);

        $datosSupervisor1 = [
            'venta_id' => $venta->ulid, 'tipo' => 'devolucion',
            'items_devueltos' => [$item + ['venta_detalle_id' => $linea->ulid]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        ];
        $this->seleccionarTerminalDeCaja();
        $this->postJson('/api/v1/devoluciones', $datosSupervisor1, ['X-Autorizacion-Supervisor' => self::conSupervisor($this->usuario, AccionSupervisor::Reembolsar, $datosSupervisor1, $venta->ulid, sesionHash: hash('sha256', session()->getId()))->token])->assertCreated()->assertJsonPath('data.venta.id', $venta->ulid);
        $this->assertSame($venta->id, Devolucion::query()->latest('id')->firstOrFail()->venta_id);
    }

    public function test_la_venta_recibe_la_nota_de_credito_por_ulid(): void
    {
        $nota = NotaCredito::factory()->create(['tenant_id' => $this->tenant->id, 'cliente_id' => $this->cliente->id]);
        $cuerpo = $this->payloadVenta(['nota_credito_id' => $nota->getKey()]);

        $this->postJson('/api/v1/ventas', $cuerpo)->assertStatus(422)->assertJsonValidationErrors(['nota_credito_id']);
        $this->postJson('/api/v1/ventas', $this->payloadVenta(['nota_credito_id' => $this->notaCreditoB->ulid]))
            ->assertStatus(422)->assertJsonValidationErrors(['nota_credito_id']);
    }

    public function test_el_listado_de_gastos_recibe_la_caja_por_ulid(): void
    {
        $this->getJson("/api/v1/gastos?caja_sesion_id={$this->caja->getKey()}")->assertStatus(422)->assertJsonValidationErrors(['caja_sesion_id']);
        $this->getJson("/api/v1/gastos?caja_sesion_id={$this->cajaB->ulid}")->assertStatus(422)->assertJsonValidationErrors(['caja_sesion_id']);
        $this->getJson("/api/v1/gastos?caja_sesion_id={$this->caja->ulid}")->assertOk();
    }

    public function test_la_venta_se_busca_por_folio_exacto_y_respeta_el_tenant(): void
    {
        $venta = $this->crearVenta();
        $venta->forceFill(['folio' => "V-{$this->sucursal->id}-100"])->save();
        $otroFolio = 'V-'.$this->ventaB->sucursal_id.'-100';
        $this->ventaB->forceFill(['folio' => $otroFolio])->save();

        $this->getJson('/api/v1/ventas?filtro_folio='.$venta->folio)->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $venta->ulid)
            ->assertJsonPath('data.0.folio', $venta->folio);
        $this->getJson('/api/v1/ventas?filtro_folio='.$otroFolio)->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/ventas?filtro_folio=V-{$this->sucursal->id}-10")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_d7_la_venta_se_busca_por_su_numero(): void
    {
        $venta = $this->crearVenta();
        $this->crearVenta();

        $sinFiltro = $this->getJson('/api/v1/ventas')->assertOk()->json();
        $this->getJson("/api/v1/ventas?filtro_numero={$venta->getKey()}")
            ->assertOk()
            ->assertExactJson($sinFiltro)
            ->assertJsonFragment(['id' => $venta->ulid]);
        $this->getJson('/api/v1/ventas?filtro_numero=abc')->assertOk()->assertExactJson($sinFiltro);
        $this->getJson("/api/v1/ventas?filtro_numero={$this->ventaB->getKey()}")
            ->assertOk()
            ->assertExactJson($sinFiltro)
            ->assertJsonMissing(['id' => $this->ventaB->ulid]);
    }

    public function test_la_auditoria_por_registro_recibe_el_ulid_de_los_documentos(): void
    {
        $venta = $this->crearVenta();
        $datosSupervisor1 = ['motivo' => 'prueba'];
        $this->patchJson("/api/v1/ventas/{$venta->ulid}/anular", $datosSupervisor1, ['X-Autorizacion-Supervisor' => self::conSupervisor($this->usuario, AccionSupervisor::AnularVenta, $datosSupervisor1, $venta->ulid)->token])->assertOk();
        $this->assertTrue(Auditoria::query()->where('tabla_afectada', 'ventas')->where('registro_id', $venta->id)->exists());

        $this->getJson("/api/v1/auditoria?tabla=ventas&registro_id={$venta->ulid}")
            ->assertOk()
            ->assertJsonPath('data.0.registro_id', $venta->id);
        $this->getJson("/api/v1/auditoria?tabla=ventas&registro_id={$venta->getKey()}")
            ->assertStatus(422)->assertJsonValidationErrors(['registro_id']);
        $this->getJson('/api/v1/auditoria?tabla=ventas&registro_id='.strtolower((string) Str::ulid()))
            ->assertOk()->assertJsonCount(0, 'data');
        // Un catálogo sigue con su id.
        $this->getJson("/api/v1/auditoria?tabla=productos&registro_id={$this->producto->id}")->assertOk();
    }
}
