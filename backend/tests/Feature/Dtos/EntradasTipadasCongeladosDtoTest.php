<?php

namespace Tests\Feature\Dtos;

use App\Modules\Delivery\Dtos\CrearPedidoDto;
use App\Modules\Delivery\Http\Requests\CrearPedidoRequest;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Prestamos\Dtos\CrearPrestamoDto;
use App\Modules\Prestamos\Http\Requests\CrearPrestamoRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class EntradasTipadasCongeladosDtoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private Sucursal $sucursalExtra;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([]);
        $this->sucursalExtra = Sucursal::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Norte A',
        ]);
    }

    public function test_pedido_dto_sin_todas_usa_la_sucursal_del_usuario(): void
    {
        $request = $this->validar(CrearPedidoRequest::class, [
            'cliente_id' => $this->cliente->id,
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearPedidoDto::class, $dto);
        $this->assertSame($this->sucursal->id, $dto->sucursalId);
    }

    public function test_pedido_dto_con_todas_usa_la_sucursal_solicitada(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);

        $request = $this->validar(CrearPedidoRequest::class, [
            'cliente_id' => $this->cliente->id,
            'sucursal_id' => $this->sucursalExtra->id,
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearPedidoDto::class, $dto);
        $this->assertSame($this->sucursalExtra->id, $dto->sucursalId);
    }

    public function test_prestamo_dto_tipa_los_campos_del_prestamo(): void
    {
        $request = $this->validar(CrearPrestamoRequest::class, [
            'proveedor_id' => $this->proveedor->id,
            'referencia' => 'PRESTAMO-1',
            'monto' => 1000,
            'interes' => 5,
            'fecha_prestamo' => now()->toDateString(),
            'notas' => 'Nota de prueba',
        ]);

        $dto = $request->toDto();

        $this->assertInstanceOf(CrearPrestamoDto::class, $dto);
        $this->assertSame($this->proveedor->id, $dto->proveedorId);
        $this->assertSame('PRESTAMO-1', $dto->referencia);
        $this->assertSame(1000.0, $dto->monto);
        $this->assertSame(5.0, $dto->interes);
        $this->assertSame('Nota de prueba', $dto->notas);
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
