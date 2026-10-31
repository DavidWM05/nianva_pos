<?php

namespace Tests\Feature\Dtos;

use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Http\Requests\GuardarProductoRequest;
use App\Modules\Inventario\Http\Requests\RegistrarCompraRequest;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class EntradasTipadasCatalogosDtoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([]);
    }

    public function test_compra_dto_tipa_los_items_anidados(): void
    {
        $request = $this->validar(RegistrarCompraRequest::class, [
            'proveedor_id' => $this->proveedor->id,
            'numero_comprobante' => 'F-PRUEBA-1',
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 2,
                'precio_compra' => 50,
            ]],
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CompraDto::class, $dto);
        $this->assertSame($this->proveedor->id, $dto->proveedorId);
        $this->assertSame('F-PRUEBA-1', $dto->numeroComprobante);
        $this->assertCount(1, $dto->items);
        $this->assertInstanceOf(LineaCompraDto::class, $dto->items[0]);
        $this->assertSame($this->variante->id, $dto->items[0]->varianteId);
        $this->assertSame(2, $dto->items[0]->cantidad);
        $this->assertSame(50.0, $dto->items[0]->precioCompra);
    }

    public function test_guardar_producto_en_edicion_distingue_ausente_de_null(): void
    {
        $sinDescripcion = $this->validar(GuardarProductoRequest::class, ['nombre' => 'Solo nombre'])->toDto();
        $conDescripcionNula = $this->validar(GuardarProductoRequest::class, [
            'nombre' => 'Con descripcion nula',
            'descripcion' => null,
        ])->toDto();

        $this->assertSame(['nombre'], $sinDescripcion->camposPresentes());
        $this->assertSame(['nombre' => 'Solo nombre'], $sinDescripcion->datosPresentes());

        $this->assertSame(['nombre', 'descripcion'], $conDescripcionNula->camposPresentes());
        $this->assertSame(
            ['nombre' => 'Con descripcion nula', 'descripcion' => null],
            $conDescripcionNula->datosPresentes(),
        );
    }

    /**
     * @param  class-string<SolicitudNegocio>  $clase
     * @param  array<string, mixed>  $payload
     */
    private function validar(string $clase, array $payload): SolicitudNegocio
    {
        $request = $clase::create('/api/test', 'POST', $payload);
        $request->setContainer(app());
        $request->setRedirector(app('redirect'));
        $request->setUserResolver(fn () => $this->usuario);
        $request->validateResolved();

        return $request;
    }
}
