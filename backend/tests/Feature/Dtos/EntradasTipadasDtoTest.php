<?php

namespace Tests\Feature\Dtos;

use App\Modules\Apartados\Dtos\CrearApartadoDto;
use App\Modules\Apartados\Dtos\LineaApartadoDto;
use App\Modules\Apartados\Http\Requests\CrearApartadoRequest;
use App\Modules\Devoluciones\Dtos\CrearDevolucionDto;
use App\Modules\Devoluciones\Dtos\ItemDevueltoDto;
use App\Modules\Devoluciones\Http\Requests\CrearDevolucionRequest;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Http\Requests\CrearVentaRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class EntradasTipadasDtoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([]);
    }

    public function test_crear_venta_dto_tipa_lineas_pagos_y_valores_por_defecto(): void
    {
        $request = $this->validar(CrearVentaRequest::class, [
            'cliente_id' => $this->cliente->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 2]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 200]],
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearVentaDto::class, $dto);
        $this->assertSame($this->cliente->id, $dto->clienteId);
        $this->assertCount(1, $dto->items);
        $this->assertInstanceOf(LineaVentaDto::class, $dto->items[0]);
        $this->assertSame($this->variante->id, $dto->items[0]->varianteId);
        $this->assertSame(2, $dto->items[0]->cantidad);
        $this->assertCount(1, $dto->pagos);
        $this->assertInstanceOf(PagoDto::class, $dto->pagos[0]);
        $this->assertSame($this->metodoPago->id, $dto->pagos[0]->metodoPagoId);
        $this->assertSame(200.0, $dto->pagos[0]->monto);
        $this->assertNull($dto->cuponCodigo);
        $this->assertSame(0.0, $dto->descuentoManual);
        $this->assertNull($dto->giftCardCodigo);
        $this->assertNull($dto->notaCreditoId);
    }

    public function test_crear_devolucion_dto_tipa_items_y_valores_por_defecto(): void
    {
        $venta = $this->crearVenta();

        $request = $this->validar(CrearDevolucionRequest::class, [
            'venta_id' => $venta->id,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearDevolucionDto::class, $dto);
        $this->assertSame($venta->id, $dto->ventaId);
        $this->assertSame('devolucion', $dto->tipo);
        $this->assertCount(1, $dto->itemsDevueltos);
        $this->assertInstanceOf(ItemDevueltoDto::class, $dto->itemsDevueltos[0]);
        $this->assertSame($this->variante->id, $dto->itemsDevueltos[0]->varianteId);
        $this->assertSame(1, $dto->itemsDevueltos[0]->cantidad);
        $this->assertFalse($dto->itemsDevueltos[0]->vaAMerma);
        $this->assertSame([], $dto->itemsNuevos);
        $this->assertSame([], $dto->pagos);
        $this->assertNull($dto->motivo);
        $this->assertSame('efectivo', $dto->tipoReembolso);
    }

    public function test_crear_apartado_dto_tipa_lineas_y_valores_por_defecto(): void
    {
        $request = $this->validar(CrearApartadoRequest::class, [
            'cliente_id' => $this->cliente->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 3]],
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearApartadoDto::class, $dto);
        $this->assertSame($this->cliente->id, $dto->clienteId);
        $this->assertCount(1, $dto->items);
        $this->assertInstanceOf(LineaApartadoDto::class, $dto->items[0]);
        $this->assertSame($this->variante->id, $dto->items[0]->varianteId);
        $this->assertSame(3, $dto->items[0]->cantidad);
        $this->assertNull($dto->fechaVencimiento);
        $this->assertNull($dto->notas);
    }

    /**
     * @param  class-string<SolicitudNegocio>  $clase
     * @param  array<string, mixed>  $payload
     */
    private function validar(string $clase, array $payload): SolicitudNegocio
    {
        $request = $clase::create('/api/v1/test', 'POST', $payload);
        $request->setContainer(app());
        $request->setRedirector(app('redirect'));
        $request->setUserResolver(fn () => $this->usuario);
        $request->validateResolved();

        return $request;
    }
}
