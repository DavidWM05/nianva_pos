<?php

namespace Tests\Feature\Dtos;

use App\Modules\Cotizaciones\Dtos\CrearCotizacionDto;
use App\Modules\Cotizaciones\Http\Requests\CrearCotizacionRequest;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Produccion\Dtos\CrearRecetaDto;
use App\Modules\Produccion\Dtos\IngredienteRecetaDto;
use App\Modules\Produccion\Http\Requests\CrearRecetaRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class EntradasTipadasExtensionesDtoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private Sucursal $sucursalExtra;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['cotizaciones.crear', 'produccion.crear']);
        $this->sucursalExtra = Sucursal::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Norte A',
        ]);
    }

    public function test_receta_dto_tipa_los_ingredientes_anidados(): void
    {
        $request = $this->validar(CrearRecetaRequest::class, [
            'variante_id' => $this->variante->id,
            'nombre' => 'Receta de prueba',
            'rendimiento' => 2,
            'ingredientes' => [[
                'insumo_id' => $this->crearInsumo()->id,
                'cantidad' => 3,
                'unidad_medida_id' => $this->unidadMedidaGlobal->id,
            ]],
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearRecetaDto::class, $dto);
        $this->assertSame($this->variante->id, $dto->varianteId);
        $this->assertSame('Receta de prueba', $dto->nombre);
        $this->assertSame(2.0, $dto->rendimiento);
        $this->assertCount(1, $dto->ingredientes);
        $this->assertInstanceOf(IngredienteRecetaDto::class, $dto->ingredientes[0]);
        $this->assertSame(3.0, $dto->ingredientes[0]->cantidad);
        $this->assertSame($this->unidadMedidaGlobal->id, $dto->ingredientes[0]->unidadMedidaId);
    }

    public function test_cotizacion_dto_sin_todas_usa_la_sucursal_del_usuario(): void
    {
        $request = $this->validar(CrearCotizacionRequest::class, $this->payloadCotizacion());

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearCotizacionDto::class, $dto);
        $this->assertSame($this->sucursal->id, $dto->sucursalId);
    }

    public function test_cotizacion_dto_con_todas_usa_la_sucursal_solicitada(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);

        $request = $this->validar(
            CrearCotizacionRequest::class,
            $this->payloadCotizacion($this->sucursalExtra->id),
        );

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearCotizacionDto::class, $dto);
        $this->assertSame($this->sucursalExtra->id, $dto->sucursalId);
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadCotizacion(?int $sucursalId = null): array
    {
        $payload = [
            'cliente_id' => $this->cliente->id,
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 100,
            ]],
        ];

        if ($sucursalId !== null) {
            $payload['sucursal_id'] = $sucursalId;
        }

        return $payload;
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
