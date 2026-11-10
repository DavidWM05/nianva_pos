<?php

declare(strict_types=1);

namespace Tests\Feature\Precios;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use App\Modules\Tpv\Services\VentaService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PricingServiceTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('carritos')]
    public function test_cotiza_el_resultado_completo_de_cada_linea_y_del_carrito(array $caso): void
    {
        $tenant = Tenant::factory()->create();
        $otro = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $categoria = Categoria::factory()->create(['tenant_id' => $tenant->id]);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'precio_venta' => 100]);
        $producto2 = Producto::factory()->create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'precio_venta' => 80]);
        $ajeno = Producto::factory()->create(['tenant_id' => $otro->id, 'precio_venta' => 100]);
        $variantes = [
            'v1' => ProductoVariante::factory()->create(['producto_id' => $producto->id]),
            'v2' => ProductoVariante::factory()->create(['producto_id' => $producto2->id]),
            'otra' => ProductoVariante::factory()->create(['producto_id' => $ajeno->id]),
        ];
        $ids = array_map(static fn (ProductoVariante $v): int => $v->id, $variantes);
        foreach ($caso['reglas'] as $indice => $datos) {
            $tenantRegla = ($datos['otro_tenant'] ?? false) ? $otro : $tenant;
            unset($datos['otro_tenant']);
            $regla = ReglaPrecio::factory()->create(array_merge([
                'tenant_id' => $tenantRegla->id,
                'variante_id' => $datos['aplica_a'] === 'variante' ? $variantes['v1']->id : null,
                'producto_id' => $datos['aplica_a'] === 'producto' ? $producto->id : null,
                'categoria_id' => $datos['aplica_a'] === 'categoria' ? $categoria->id : null,
            ], $datos));
            $ids['r'.$indice] = $regla->id;
        }
        $codigo = $caso['codigo'] ?? null;
        if (isset($caso['cupon_otro_tenant'])) {
            Cupon::factory()->create(array_merge(['tenant_id' => $otro->id, 'codigo' => 'TABLA-05A'], $caso['cupon_otro_tenant']));
            $codigo = 'TABLA-05A';
        }
        if (isset($caso['cupon'])) {
            $cupon = Cupon::factory()->create(array_merge(['tenant_id' => $tenant->id, 'codigo' => 'TABLA-05A'], $caso['cupon']));
            $ids['c'] = $cupon->id;
            $codigo = $cupon->codigo;
        }
        if ($caso['ambiente_otro'] ?? false) {
            app(TenantContext::class)->set($otro);
        }
        $contexto = new ContextoPrecio($tenant->id, $sucursal->id, null, CarbonImmutable::parse('2024-04-15 12:00:00'), 987);
        $carrito = new Carrito(array_map(static fn (array $linea): LineaCarrito => new LineaCarrito($ids[$linea[0]], $linea[1]), $caso['lineas']), $codigo, $caso['referencia'] ?? null);
        if (($caso['excepcion'] ?? null) === 'cupon') {
            $this->expectException(CuponInvalidoException::class);
            $this->expectExceptionMessage("El cupon '{$codigo}' no existe, esta inactivo o esta fuera de su vigencia.");
        } elseif (($caso['excepcion'] ?? null) === 'tenant') {
            $this->expectException(\InvalidArgumentException::class);
            $this->expectExceptionMessage("La variante {$ids['otra']} no pertenece al tenant {$tenant->id}.");
        }
        $resultado = app(PricingService::class)->cotizar($carrito, $contexto);
        if (isset($caso['excepcion'])) {
            return;
        }
        $actual = get_object_vars($resultado);
        $actual['lineas'] = array_map(static function ($linea): array {
            $datos = get_object_vars($linea);
            $datos['reglas'] = array_map(static fn ($regla): array => get_object_vars($regla), $linea->reglas);

            return $datos;
        }, $resultado->lineas);
        $actual['cupon'] = $resultado->cupon === null ? null : get_object_vars($resultado->cupon);
        $esperado = $caso['esperado'];
        array_walk_recursive($esperado, static function (&$valor) use ($ids): void {
            if (is_string($valor) && isset($ids[$valor])) {
                $valor = $ids[$valor];
            }
        });
        foreach ($esperado['lineas'] as &$linea) {
            foreach (['precioBase', 'descuento', 'impuesto', 'total'] as $campo) {
                $linea[$campo] = (float) $linea[$campo];
            }
        }
        unset($linea);
        foreach (['subtotal', 'total'] as $campo) {
            $esperado[$campo] = (float) $esperado[$campo];
        }
        if ($esperado['cupon'] !== null) {
            $esperado['cupon']['descuento'] = (float) $esperado['cupon']['descuento'];
        }
        $this->assertSame($esperado, $actual);
    }

    public static function carritos(): array
    {
        return [
            'SEG-01 regla todo de otro tenant no se aplica' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'todo', 'tipo' => 'porcentaje', 'valor' => 75, 'otro_tenant' => true, 'activo' => true, 'fecha_inicio' => '2024-04-01', 'fecha_fin' => '2024-04-30']], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => null, 'total' => 200]]],
            'SEG-01 mismo codigo usa el cupon del tenant del contexto' => [['lineas' => [['v1', 2]], 'reglas' => [], 'cupon_otro_tenant' => ['tipo' => 'porcentaje', 'valor' => 75, 'activo' => true, 'fecha_inicio' => '2024-04-01', 'fecha_fin' => '2024-04-30'], 'cupon' => ['tipo' => 'porcentaje', 'valor' => 15, 'activo' => true, 'fecha_inicio' => '2024-04-01', 'fecha_fin' => '2024-04-30'], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => ['id' => 'c', 'descuento' => 30], 'total' => 170]]],
            'SEG-01 cupon exclusivo de otro tenant es invalido' => [['lineas' => [['v1', 2]], 'reglas' => [], 'cupon_otro_tenant' => ['tipo' => 'porcentaje', 'valor' => 75, 'activo' => true, 'fecha_inicio' => '2024-04-01', 'fecha_fin' => '2024-04-30'], 'excepcion' => 'cupon']],
            'cantidad cero conserva el cálculo anterior' => [['lineas' => [['v1', 0]], 'reglas' => [], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 0, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 0]], 'subtotal' => 0, 'cupon' => null, 'total' => 0]]],
            'sin regla' => [['lineas' => [['v1', 2]], 'reglas' => [], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => null, 'total' => 200]]],
            'porcentaje' => [['lineas' => [['v1', 3]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 3, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 60, 'impuesto' => 0, 'total' => 240]], 'subtotal' => 240, 'cupon' => null, 'total' => 240]]],
            'monto fijo sin tope' => [['lineas' => [['v1', 3]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'monto_fijo', 'valor' => 25]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 3, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'monto_fijo', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 75, 'impuesto' => 0, 'total' => 225]], 'subtotal' => 225, 'cupon' => null, 'total' => 225]]],
            'monto fijo con tope' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'monto_fijo', 'valor' => 150]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'monto_fijo', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 200, 'impuesto' => 0, 'total' => 0]], 'subtotal' => 0, 'cupon' => null, 'total' => 0]]],
            'nxm con resto' => [['lineas' => [['v1', 8]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'nxm', 'valor' => null, 'cantidad_compra' => 3, 'cantidad_paga' => 2]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 8, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'nxm', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 200, 'impuesto' => 0, 'total' => 600]], 'subtotal' => 600, 'cupon' => null, 'total' => 600]]],
            'bundle con resto' => [['lineas' => [['v1', 8]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'bundle', 'valor' => null, 'cantidad_compra' => 3, 'precio_bundle' => 200]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 8, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'bundle', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 200, 'impuesto' => 0, 'total' => 600]], 'subtotal' => 600, 'cupon' => null, 'total' => 600]]],
            'cascada variante se detiene antes de producto categoria y todo' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20], ['aplica_a' => 'producto', 'tipo' => 'porcentaje', 'valor' => 50], ['aplica_a' => 'categoria', 'tipo' => 'porcentaje', 'valor' => 75], ['aplica_a' => 'todo', 'tipo' => 'porcentaje', 'valor' => 90]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 40, 'impuesto' => 0, 'total' => 160]], 'subtotal' => 160, 'cupon' => null, 'total' => 160]]],
            'cascada producto se detiene antes de categoria y todo' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'producto', 'tipo' => 'porcentaje', 'valor' => 30], ['aplica_a' => 'categoria', 'tipo' => 'porcentaje', 'valor' => 60], ['aplica_a' => 'todo', 'tipo' => 'porcentaje', 'valor' => 80]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 2, 'combinable' => false]], 'descuento' => 60, 'impuesto' => 0, 'total' => 140]], 'subtotal' => 140, 'cupon' => null, 'total' => 140]]],
            'cascada categoria se detiene antes de todo' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'categoria', 'tipo' => 'porcentaje', 'valor' => 40], ['aplica_a' => 'todo', 'tipo' => 'porcentaje', 'valor' => 80]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 3, 'combinable' => false]], 'descuento' => 80, 'impuesto' => 0, 'total' => 120]], 'subtotal' => 120, 'cupon' => null, 'total' => 120]]],
            'cascada todo' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'todo', 'tipo' => 'porcentaje', 'valor' => 10]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 4, 'combinable' => false]], 'descuento' => 20, 'impuesto' => 0, 'total' => 180]], 'subtotal' => 180, 'cupon' => null, 'total' => 180]]],
            'desempate por id mas alto' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 10], ['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r1', 'tipo' => 'porcentaje', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 40, 'impuesto' => 0, 'total' => 160]], 'subtotal' => 160, 'cupon' => null, 'total' => 160]]],
            'regla inactiva' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20, 'activo' => false]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => null, 'total' => 200]]],
            'inicio futuro respecto al contexto' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20, 'fecha_inicio' => '2024-04-16']], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => null, 'total' => 200]]],
            'fin pasado respecto al contexto' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20, 'fecha_fin' => '2024-04-14']], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => null, 'total' => 200]]],
            'vigente en contexto y no hoy limites inclusivos' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 30, 'fecha_inicio' => '2024-04-15', 'fecha_fin' => '2024-04-15']], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 60, 'impuesto' => 0, 'total' => 140]], 'subtotal' => 140, 'cupon' => null, 'total' => 140]]],
            'cupon porcentaje' => [['lineas' => [['v1', 2]], 'reglas' => [], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => ['id' => 'c', 'descuento' => 30], 'total' => 170], 'cupon' => ['tipo' => 'porcentaje', 'valor' => 15]]],
            'cupon fijo con tope en total' => [['lineas' => [['v1', 2]], 'reglas' => [], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => ['id' => 'c', 'descuento' => 200], 'total' => 0], 'cupon' => ['tipo' => 'monto_fijo', 'valor' => 300]]],
            'cupon despues de descuento de linea' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 40, 'impuesto' => 0, 'total' => 160]], 'subtotal' => 160, 'cupon' => ['id' => 'c', 'descuento' => 16], 'total' => 144], 'cupon' => ['tipo' => 'porcentaje', 'valor' => 10]]],
            'cupon vigente en contexto pero no hoy' => [['lineas' => [['v1', 2]], 'reglas' => [], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 200, 'cupon' => ['id' => 'c', 'descuento' => 20], 'total' => 180], 'cupon' => ['tipo' => 'porcentaje', 'valor' => 10, 'fecha_inicio' => '2024-04-15', 'fecha_fin' => '2024-04-15']]],
            'cupon invalido' => [['lineas' => [['v1', 2]], 'reglas' => [], 'codigo' => 'NO-EXISTE', 'excepcion' => 'cupon']],
            'cupon inactivo' => [['lineas' => [['v1', 2]], 'reglas' => [], 'cupon' => ['tipo' => 'porcentaje', 'valor' => 10, 'activo' => false], 'excepcion' => 'cupon']],
            'cupon futuro respecto al contexto' => [['lineas' => [['v1', 2]], 'reglas' => [], 'cupon' => ['tipo' => 'porcentaje', 'valor' => 10, 'fecha_inicio' => '2024-04-16'], 'excepcion' => 'cupon']],
            'cupon vencido respecto al contexto' => [['lineas' => [['v1', 2]], 'reglas' => [], 'cupon' => ['tipo' => 'porcentaje', 'valor' => 10, 'fecha_fin' => '2024-04-14'], 'excepcion' => 'cupon']],
            'variante de otro tenant' => [['lineas' => [['otra', 1]], 'reglas' => [], 'excepcion' => 'tenant']],
            'no usa las reglas del tenant ambiental' => [['lineas' => [['v1', 2]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 20], ['aplica_a' => 'todo', 'tipo' => 'porcentaje', 'valor' => 100, 'otro_tenant' => true]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 40, 'impuesto' => 0, 'total' => 160]], 'subtotal' => 160, 'cupon' => null, 'total' => 160], 'ambiente_otro' => true]],
            'no agrega lineas duplicadas para calcular promociones' => [['lineas' => [['v1', 2], ['v1', 3]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'nxm', 'valor' => null, 'cantidad_compra' => 3, 'cantidad_paga' => 2]], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'nxm', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 0, 'impuesto' => 0, 'total' => 200], ['varianteId' => 'v1', 'cantidad' => 3, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'nxm', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 100, 'impuesto' => 0, 'total' => 200]], 'subtotal' => 400, 'cupon' => null, 'total' => 400]]],
            'dos productos con cupon' => [['lineas' => [['v1', 2], ['v2', 3]], 'reglas' => [['aplica_a' => 'variante', 'tipo' => 'porcentaje', 'valor' => 10]], 'cupon' => ['tipo' => 'monto_fijo', 'valor' => 50], 'esperado' => ['lineas' => [['varianteId' => 'v1', 'cantidad' => 2, 'precioBase' => 100, 'listaAplicada' => null, 'reglas' => [['id' => 'r0', 'tipo' => 'porcentaje', 'prioridad' => 1, 'combinable' => false]], 'descuento' => 20, 'impuesto' => 0, 'total' => 180], ['varianteId' => 'v2', 'cantidad' => 3, 'precioBase' => 80, 'listaAplicada' => null, 'reglas' => [], 'descuento' => 0, 'impuesto' => 0, 'total' => 240]], 'subtotal' => 420, 'cupon' => ['id' => 'c', 'descuento' => 50], 'total' => 370]]],
            'compatibilidad de validacion sin lineas y sin redondeo anticipado' => [['lineas' => [], 'reglas' => [], 'referencia' => 100.049, 'cupon' => ['tipo' => 'porcentaje', 'valor' => 50], 'esperado' => ['lineas' => [], 'subtotal' => 100.049, 'cupon' => ['id' => 'c', 'descuento' => 50.02], 'total' => 50.03]]],
            'referencia cero con cupon fijo' => [['lineas' => [], 'reglas' => [], 'referencia' => 0, 'cupon' => ['tipo' => 'monto_fijo', 'valor' => 50], 'esperado' => ['lineas' => [], 'subtotal' => 0, 'cupon' => ['id' => 'c', 'descuento' => 0], 'total' => 0]]],
        ];
    }

    public function test_la_referencia_de_validacion_no_puede_sustituir_los_precios_de_lineas(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('El subtotal de referencia solo admite carritos sin líneas.');
        new Carrito([new LineaCarrito(1, 1)], 'CODIGO', 1);
    }

    public function test_cotizar_items_conserva_lineas_con_claves_no_consecutivas(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => 100]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $resultado = app(VentaService::class)->cotizarItems($tenant->id, [5 => ['variante_id' => (string) $variante->id, 'cantidad' => 1]]);
        $this->assertSame([[['variante_id' => $variante->id, 'regla_precio_id' => null, 'cantidad' => 1, 'precio_unitario' => 100.0, 'descuento_aplicado' => 0.0, 'subtotal' => 100.0]], 100.0], $resultado);
    }
}
